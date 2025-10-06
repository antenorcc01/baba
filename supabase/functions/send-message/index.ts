import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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
    const { to, message, channel } = await req.json();

    if (!to || !message || !channel) {
      return new Response(JSON.stringify({ error: 'Missing "to", "message", or "channel" parameters.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Attempting to send message via ${channel} to ${to}: "${message}"`);

    // --- START: Twilio Messaging API Integration ---
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const messagingServiceSid = Deno.env.get('TWILIO_MESSAGING_SERVICE_SID');

    if (!accountSid || !authToken || !messagingServiceSid) {
      throw new Error('Twilio credentials (ACCOUNT_SID, AUTH_TOKEN, MESSAGING_SERVICE_SID) not set in environment variables.');
    }

    let formattedTo = to;
    if (channel === 'whatsapp') {
      // For WhatsApp, Twilio expects the 'To' number to be prefixed with 'whatsapp:'
      formattedTo = `whatsapp:${to}`;
    } else if (channel === 'sms') {
      // For SMS, Twilio expects the 'To' number to be in E.164 format (e.g., +5585986897660)
      // Ensure the 'to' number already has the '+' prefix. If not, you might need to add it.
      if (!formattedTo.startsWith('+')) {
        console.warn(`'To' number ${formattedTo} for SMS does not start with '+'. Adding it.`);
        formattedTo = `+${formattedTo}`; // Basic attempt to fix, but full E.164 validation is better
      }
    } else {
      throw new Error(`Unsupported channel: ${channel}. Only 'whatsapp' and 'sms' are supported.`);
    }

    const twilioResponse = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
      },
      body: new URLSearchParams({
        To: formattedTo,
        MessagingServiceSid: messagingServiceSid,
        Body: message,
      }).toString(),
    });

    if (!twilioResponse.ok) {
      const errorBody = await twilioResponse.json();
      throw new Error(`Failed to send message via Twilio: ${twilioResponse.status} - ${JSON.stringify(errorBody)}`);
    }
    console.log('Message sent successfully via Twilio.');

    const responseBody = await twilioResponse.json(); // Get the actual response from Twilio
    // --- END: Twilio Messaging API Integration ---

    return new Response(JSON.stringify({ status: 'success', message: 'Message sent via Twilio.', twilioResponse: responseBody }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("Error in send-message Edge Function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});