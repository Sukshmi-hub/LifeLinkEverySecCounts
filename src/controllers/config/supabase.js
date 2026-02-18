// src/config/supabase.js - Supabase Connection
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables!')
}

// Create Supabase client with SERVICE_ROLE key
// This bypasses RLS for backend operations
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Create Supabase client with ANON key (for auth operations)
export const supabaseAuth = createClient(
  supabaseUrl,
  process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true
    }
  }
)

export default supabase