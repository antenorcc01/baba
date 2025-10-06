import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://xuecwnkkukmgftpdbqxx.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh1ZWN3bmtrdWttZ2Z0cGRicXh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3ODk0MDUsImV4cCI6MjA3NTM2NTQwNX0.oUoYKaJyLFZXxm2OvS2FOdBJM7XqJwSQd6_rYiDz6dY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)