// src/controllers/authController.js
import User from '../models/User.js';
import Patient from '../models/Patient.js';
import Donor from '../models/Donor.js';
import Hospital from '../models/Hospital.js';
import NGO from '../models/NGO.js';
import Admin from '../models/Admin.js';
import jwt from 'jsonwebtoken';

// Helper to parse MongoDB duplicate key errors into { field, value }
const parseDuplicateKeyError = (err) => {
  try {
    if (err.keyValue && typeof err.keyValue === 'object') {
      const field = Object.keys(err.keyValue)[0];
      return { field, value: err.keyValue[field] };
    }
    // Fallback: attempt to parse from error.message
    // Examples of message formats vary; try to extract "dup key: { : \"value\" }" and index name
    const msg = err.message || '';
    // Try to extract value between quotes after dup key
    const valueMatch = msg.match(/dup key:\s*\{\s*: "([^"]+)"\s*\}/);
    const idxMatch = msg.match(/index:\s*([^\s]+)\s*/);
    const value = valueMatch ? valueMatch[1] : undefined;
    let field;
    if (idxMatch) {
      // index may be like db.collection.$field_1
      const idx = idxMatch[1];
      const parts = idx.split('\.');
      const last = parts[parts.length - 1];
      field = last.replace(/\$?/, '').replace(/_\d+$/, '');
    }
    return { field: field || 'field', value };
  } catch (e) {
    return { field: 'field', value: undefined };
  }
};

const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

export const register = async (req, res) => {
  try {
    const { email, password, name, phone, role, aadhaar_no, age, blood_type, location } = req.body;
    console.log('Register payload:', { email, name, role, phone });

    // Normalize aadhaar: trim and treat empty string as not provided
    const cleanAadhaar = aadhaar_no && String(aadhaar_no).trim() ? String(aadhaar_no).trim() : undefined;

    // 1. Strict Validation: require aadhaar_no only for patient/donor
    // Remove aadhaar_no validation for NGO role
    if (role === 'ngo') {
      if (!email || !password || !name) {
        return res.status(400).json({
          success: false,
          message: 'Missing fields: email, password, and name are required for NGO.',
        });
      }
    } else {
      // Existing validation for other roles
      if (!email || !password || !name || !role) {
        return res.status(400).json({
          success: false,
          message: 'Missing fields: email, password, name, and role are required.',
        });
      }
    }
    if ((role === 'patient' || role === 'donor') && !cleanAadhaar) {
      return res.status(400).json({
        success: false,
        message: 'Aadhaar number is required for patients and donors.',
      });
    }

    // Role-specific required fields
    if (role === 'patient' || role === 'donor') {
      if (age === undefined || age === null) {
        return res.status(400).json({
          success: false,
          message: 'Age is required for patients and donors.',
        });
      }
      if (!blood_type) {
        return res.status(400).json({
          success: false,
          message: 'Blood type is required for patients and donors.',
        });
      }
    }

    // 2. Check if user already exists (only check aadhaar if provided for patient/donor)
    let existingUser = null;
    if (role === 'patient' || role === 'donor') {
      if (cleanAadhaar) {
        existingUser = await User.findOne({ $or: [{ email }, { aadhaar_no: cleanAadhaar }] });
      } else {
        existingUser = await User.findOne({ email });
      }
    } else {
      existingUser = await User.findOne({ email });
    }

    let userToUse = null;
    if (existingUser) {
      if (existingUser.role === role) {
        return res.status(400).json({
          success: false,
          message: 'User with this email already exists.',
        });
      }

      userToUse = existingUser;
      if (password) {
        userToUse.password = password;
      }
      if (cleanAadhaar) {
        userToUse.aadhaar_no = cleanAadhaar;
      }
      userToUse.name = userToUse.name || name;
      userToUse.phone = userToUse.phone || phone || null;
      await userToUse.save();
    }

    const userData = {
      name,
      email,
      password,
      phone: phone || null,
      role,
      is_verified: false,
    };
    if (cleanAadhaar && (role === 'patient' || role === 'donor')) userData.aadhaar_no = cleanAadhaar;

    let newUser = null;
    if (userToUse) {
      newUser = userToUse;
    } else {
      newUser = new User(userData);
      await newUser.save();
    }

    const roleModelMap = {
      patient: Patient,
      donor: Donor,
      hospital: Hospital,
      ngo: NGO,
      admin: Admin,
    };
    const Model = roleModelMap[role];
    if (!Model) {
      await User.findByIdAndDelete(newUser._id).catch(() => {});
      return res.status(500).json({
        success: false,
        message: 'Unknown role for handling',
        error: 'No model found',
      });
    }

    const filter = {};
    if ((role === 'patient' || role === 'donor') && cleanAadhaar) {
      filter.aadhaar_no = cleanAadhaar;
    } else {
      filter.userId = newUser._id;
    }

    const roleData = {
      userId: newUser._id,
      name: name,
      email: email,
      phone: phone || null,
      password: password,
    };
    if (role === 'patient') {
      roleData.aadhaar_no = cleanAadhaar;
      roleData.age = age || null;
      roleData.blood_type = blood_type || 'O+';
      roleData.location = location || {};
    }
    if (role === 'donor') {
      roleData.aadhaar_no = cleanAadhaar;
      roleData.age = age || null;
      roleData.blood_type = blood_type || 'O+';
      roleData.donation_type = req.body.donation_type || [];
      roleData.location = location || {};
    }

    try {
      const update = { $set: {}, $setOnInsert: {} };
      update.$set.name = roleData.name;
      update.$set.email = roleData.email;
      update.$set.phone = roleData.phone;
      update.$set.password = roleData.password;
      update.$setOnInsert.userId = newUser._id;
      if (role === 'patient' || role === 'donor') {
        if (cleanAadhaar) update.$setOnInsert.aadhaar_no = cleanAadhaar;
        update.$set.age = roleData.age;
        update.$set.blood_type = roleData.blood_type;
        update.$set.location = roleData.location;
      }

      await Model.findOneAndUpdate(filter, update, {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
        runValidators: true,
      });
    } catch (err) {
      console.error('Role upsert failed:', err);
      await User.findByIdAndDelete(newUser._id).catch(() => {});
      if (err && err.code === 11000) {
        const parsed = parseDuplicateKeyError(err);
        return res.status(400).json({
          success: false,
          message: `Duplicate field: ${parsed.field}`,
          field: parsed.field,
          value: parsed.value,
          error: err.message,
        });
      }
      if (err.name === 'ValidationError') {
        const details = Object.keys(err.errors || {}).map((k) => err.errors[k].message);
        const msg = details.length ? `Validation error: ${details.join('; ')}` : 'Validation error';
        return res.status(400).json({
          success: false,
          message: msg,
          errors: details,
          error: err.message,
        });
      }
      return res.status(500).json({
        success: false,
        message: 'Failed to create or attach role document',
        error: err.message,
      });
    }

    const token = generateToken(newUser._id);

    return res.status(201).json({
      success: true,
      message: 'Registration successful!',
      data: {
        user: {
          id: newUser._id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
        },
        token,
      },
    });
  } catch (error) {
    console.error('Registration Error:', error);
    if (error.code === 11000) {
      const parsed = parseDuplicateKeyError(error);
      return res.status(400).json({
        success: false,
        message: `Duplicate field: ${parsed.field}`,
        field: parsed.field,
        value: parsed.value,
        error: error.message,
      });
    }
    if (error.name === 'ValidationError') {
      const details = Object.keys(error.errors || {}).map((k) => error.errors[k].message);
      const msg = details.length ? `Validation error: ${details.join('; ')}` : 'Validation error';
      return res.status(400).json({
        success: false,
        message: msg,
        errors: details,
        error: error.message,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message,
    });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Basic validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // 2. Find user in the database (include password field)
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // 3. Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // 4. Generate Token and send success
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          name: user.name,
          role: user.role,
          email: user.email,
          phone: user.phone
        },
        token
      }
    });

  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

export const getMe = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user: {
          id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          role: req.user.role,
          phone: req.user.phone,
          is_verified: req.user.is_verified
        }
      }
    });
  } catch (error) {
    console.error('Get Me Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

export const logout = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout Error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed',
      error: error.message
    });
  }
};

export default { register, login, getMe, logout };