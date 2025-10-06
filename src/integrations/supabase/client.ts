import { createClient } from '@supabase/supabase-js'

// Replace these with your actual Supabase project URL and anon key
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dvgtmeknpucuyctbqmpk.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2Z3RtZWtucHVjdXljdGJxbXBrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MTU4NTcsImV4cCI6MjA3NDI5MTg1N30.mf6qkxGPX-DL1I4D2CD7N7N1pQywQ8ExLBahY1w0fJI'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)