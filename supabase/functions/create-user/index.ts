import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log("Edge Function 'create-user' started.");
    console.log("SUPABASE_URL:", Deno.env.get('SUPABASE_URL') ? 'Loaded' : 'Not Loaded');
    console.log("SUPABASE_ANON_KEY:", Deno.env.get('SUPABASE_ANON_KEY') ? 'Loaded' : 'Not Loaded');
    console.log("SUPABASE_SERVICE_ROLE_KEY:", Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ? 'Loaded' : 'Not Loaded');

    // 1. Create a client with the user's auth token to verify they are an admin
    const userSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user }, error: userError } = await userSupabaseClient.auth.getUser()
    if (userError) throw userError

    const { data: adminProfile, error: profileError } = await userSupabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profileError || adminProfile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Permission denied: User is not an admin.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 2. Extract new user data from the request body
    const { email, password, data: userData } = await req.json() // Renomeado 'data' para 'userData' para evitar conflito
    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Email and password are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 3. Create a Supabase admin client to create the new user
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Send confirmation email
      user_metadata: userData, // Passando 'userData'
    })

    if (createError) throw createError

    return new Response(JSON.stringify({ message: 'User created successfully', user: newUser }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error("Edge Function Error:", error.message); // Logar o erro no console da função Edge
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})