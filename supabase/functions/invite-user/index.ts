import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Verify the requesting user is an admin
    const userSupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: userError } = await userSupabaseClient.auth.getUser();
    if (userError) throw userError;

    const { data: adminProfile, error: profileError } = await userSupabaseClient
      .from('profiles')
      .select('role, baba_id')
      .eq('id', user.id)
      .single();

    if (profileError || adminProfile?.role !== 'admin' || !adminProfile.baba_id) {
      return new Response(JSON.stringify({ error: 'Acesso negado: Apenas administradores podem enviar convites.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Get data from the request body
    const { inviteeEmail, initialProfileData } = await req.json();
    if (!inviteeEmail) {
      return new Response(JSON.stringify({ error: 'O e-mail do convidado é obrigatório.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Create an admin client to invite the new user
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the Baba name for the email template
    const { data: tenantData } = await supabaseAdmin.from('tenants').select('name').eq('id', adminProfile.baba_id).single();
    const babaName = tenantData?.name || 'seu grupo';

    // 4. Invite the user via email
    const { error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      inviteeEmail,
      {
        data: {
          ...initialProfileData,
          baba_id: adminProfile.baba_id,
          baba_name: babaName,
        },
      }
    );

    if (inviteError) throw inviteError;

    return new Response(JSON.stringify({ success: true, message: 'Convite enviado com sucesso.' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Erro na Edge Function 'invite-user':", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});