// src/controllers/authController.js
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { supabase, supabaseAuth } from '../config/supabase.js'

const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  )
}

export const register = async (req, res) => {
  try {
    const { email, password, name, phone, role, aadhaar_no } = req.body

    // 1. Strict Validation
    if (!email || !password || !name || !role || !aadhaar_no) {
      return res.status(400).json({
        success: false,
        message: 'Missing fields: email, password, name, role, and aadhaar_no are required.'
      })
    }

    // 2. Hash password for the users table
    const salt = await bcrypt.genSalt(10)
    const password_hash = await bcrypt.hash(password, salt)

    // 3. Supabase Auth Signup
    const { data: authData, error: authError } = await supabaseAuth.auth.signUp({
      email,
      password,
      options: { data: { name, role } }
    })

    if (authError) {
      return res.status(400).json({ success: false, message: authError.message })
    }

    // 4. Database Insert (Matching your screenshot exactly)
    const { data: newUser, error: dbError } = await supabase
      .from('users')
      .insert([
        {
          user_id: authData.user.id,
          name,
          role,
          aadhaar_no,
          phone: phone || null,
          email,
          password_hash, // satisfy the not-null constraint
          is_verified: false
        }
      ])
       .select() // This returns the newly created row
       .single() // Since we just created 1 user, .single() is safe here
      
    if (dbError) {
      console.error('DB Error:', dbError)
      // Cleanup: delete auth user if DB fails
      await supabaseAuth.auth.admin.deleteUser(authData.user.id)
      return res.status(500).json({
        success: false,
        message: 'Database insert failed',
        error: dbError.message
      })
    }

    const token = generateToken(newUser.user_id)
    res.status(201).json({
      success: true,
      message: 'Registration successful!',
      data: { user: { id: newUser.user_id, email: newUser.email }, token }
    })

  } catch (error) {
    console.error('System Error:', error)
    res.status(500).json({ success: false, error: error.message })
  }
}

// ... keep your login, getMe, and logout functions as they were
export const login = async (req, res) => { /* same as before */ }
export const getMe = async (req, res) => { /* same as before */ }
export const logout = async (req, res) => { /* same as before */ }

export default { register, login, getMe, logout }