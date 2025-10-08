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
    const { babaName, adminEmail, adminPassword, adminProfileData } = await req.json();

    if (!babaName || !adminEmail || !adminPassword || !adminProfileData) {
      return new Response(JSON.stringify({ error: 'Dados insuficientes para criar o Baba e o administrador.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Create the new tenant (Baba)
    const { data: tenantData, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .insert({ name: babaName })
      .select('id')
      .single();

    if (tenantError) throw tenantError;
    const newBabaId = tenantData.id;

    // 2. Create the admin user with metadata pointing to the new Baba
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        ...adminProfileData,
        role: 'admin',
        baba_id: newBabaId,
      },
    });

    if (authError) {
      // Rollback: If user creation fails, delete the tenant we just created
      await supabaseAdmin.from('tenants').delete().eq('id', newBabaId);
      throw authError;
    }
    if (!authData.user) throw new Error("Falha na criação do usuário administrador.");

    // 3. Save the baba name in group_settings for the new tenant
    const { error: settingsError } = await supabaseAdmin
      .from('group_settings')
      .insert({
        baba_id: newBabaId,
        setting_key: 'baba_name',
        setting_value: babaName,
      });
    
    if (settingsError) {
      console.error("Failed to save initial baba_name setting, but continuing as it's not critical for creation.", settingsError);
    }

    return new Response(JSON.stringify({ success: true, message: 'Baba e administrador criados com sucesso.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Error in create-baba-and-admin Edge Function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});