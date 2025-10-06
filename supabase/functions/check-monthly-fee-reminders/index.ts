import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { addDays, subDays, format, getDay, getDate, getMonth, getYear, isSameMonth, isSameYear } from 'https://esm.sh/date-fns@3.6.0';
import { ptBR } from 'https://esm.sh/date-fns@3.6.0/locale';

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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const now = new Date();
    console.log(`Running monthly fee reminders check at ${now.toISOString()}`);

    // 1. Get payment due day from group settings
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('group_settings')
      .select('setting_key, setting_value')
      .eq('setting_key', 'payment_due_day')
      .single();

    if (settingsError) throw settingsError;
    const paymentDueDay = parseInt(settings.setting_value || '10', 10);

    // Calculate the due date for the current month
    const currentMonthDueDate = new Date(getYear(now), getMonth(now), paymentDueDay);
    
    // Calculate the reminder date (5 days before due date)
    const reminderDate = subDays(currentMonthDueDate, 5);

    // Check if today is the reminder day (or very close, to account for execution time)
    const isReminderDay = getDate(now) === getDate(reminderDate) && isSameMonth(now, reminderDate) && isSameYear(now, reminderDate);

    if (!isReminderDay) {
      console.log(`Not the reminder day for monthly fees. Due day: ${paymentDueDay}, Reminder day: ${format(reminderDate, 'dd/MM')}. Today: ${format(now, 'dd/MM')}`);
      return new Response(JSON.stringify({ success: true, message: 'Not the scheduled reminder day.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log(`It's the reminder day (${format(reminderDate, 'dd/MM')}) for monthly fees.`);

    // 2. Get all mensalistas who are not suspended
    const { data: mensalistas, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, phone, payment_status')
      .eq('is_mensalista', true)
      .eq('is_deleted', false)
      .eq('is_suspended', false);

    if (profilesError) throw profilesError;

    const messagesSent: string[] = [];

    for (const mensalista of mensalistas) {
      if (!mensalista.phone) {
        console.log(`Mensalista ${mensalista.full_name} has no phone number. Skipping.`);
        continue;
      }

      // Check if the mensalista has already paid for the current month
      const firstDayOfMonth = new Date(getYear(now), getMonth(now), 1);
      const lastDayOfMonth = new Date(getYear(now), getMonth(now) + 1, 0);

      const { data: payments, error: paymentsError } = await supabaseAdmin
        .from('payments')
        .select('id')
        .eq('player_id', mensalista.id)
        .eq('category', 'Mensalidade')
        .gte('payment_date', firstDayOfMonth.toISOString())
        .lte('payment_date', lastDayOfMonth.toISOString());

      if (paymentsError) throw paymentsError;

      if (payments && payments.length === 0) {
        // Mensalista has not paid for the current month, send reminder
        const message = `Lembrete: Sua mensalidade vence em 5 dias (${format(currentMonthDueDate, 'dd/MM', { locale: ptBR })}). Regularize seu pagamento para continuar participando dos babas!`;
        // Call the generic send-message function
        const { error: sendError } = await supabaseAdmin.functions.invoke('send-message', {
          body: { to: mensalista.phone, message, channel: 'whatsapp' }, // Assuming WhatsApp for now
        });
        if (sendError) console.error(`Failed to send monthly fee reminder to ${mensalista.full_name}:`, sendError);
        else messagesSent.push(`Monthly fee reminder to ${mensalista.full_name}`);
      } else {
        console.log(`Mensalista ${mensalista.full_name} has already paid for this month. Skipping reminder.`);
      }
    }

    return new Response(JSON.stringify({ success: true, messagesSent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("Error in check-monthly-fee-reminders Edge Function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});