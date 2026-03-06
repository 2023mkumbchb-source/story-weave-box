import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function normalizePhoneNumber(phone: string): string {
  phone = phone.trim().replace(/\D+/g, '');
  if (/^254\d{9}$/.test(phone)) return phone;
  if (/^07\d{8}$/.test(phone)) return '254' + phone.substring(1);
  if (/^011\d{7}$/.test(phone)) return '254' + phone.substring(1);
  if (/^\+254\d{9}$/.test(phone)) return phone.substring(1);
  return phone;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PAYHERO_USERNAME = Deno.env.get('PAYHERO_API_USERNAME');
    const PAYHERO_PASSWORD = Deno.env.get('PAYHERO_API_PASSWORD');
    const PAYHERO_CHANNEL = Deno.env.get('PAYHERO_CHANNEL_ID');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!PAYHERO_USERNAME || !PAYHERO_PASSWORD || !PAYHERO_CHANNEL) {
      throw new Error('PayHero credentials not configured');
    }
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      throw new Error('Supabase credentials not configured');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { phone, amount, package_type } = await req.json();

    if (!phone || !amount || amount <= 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'Phone and valid amount required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedPhone = normalizePhoneNumber(phone);
    const externalReference = `EXAM-${Date.now()}-${Math.floor(Math.random() * 9000) + 1000}`;
    const callbackUrl = `${SUPABASE_URL}/functions/v1/payment-callback`;

    const payHeroData = {
      amount: Number(amount),
      phone_number: normalizedPhone,
      channel_id: Number(PAYHERO_CHANNEL),
      provider: 'm-pesa',
      external_reference: externalReference,
      customer_name: 'Student',
      callback_url: callbackUrl,
    };

    console.log('Initiating PayHero payment:', payHeroData);

    const payHeroResponse = await fetch('https://backend.payhero.co.ke/api/v2/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa(`${PAYHERO_USERNAME}:${PAYHERO_PASSWORD}`),
      },
      body: JSON.stringify(payHeroData),
    });

    const payHeroResult = await payHeroResponse.json();
    console.log('PayHero response:', payHeroResult);

    if (!payHeroResponse.ok) {
      return new Response(
        JSON.stringify({ success: false, error: payHeroResult.message || 'Payment initiation failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: payment, error: dbError } = await supabase
      .from('payments')
      .insert({
        phone_number: normalizedPhone,
        amount: Number(amount),
        payment_status: 'pending',
        transaction_id: externalReference,
        package_type: package_type || 'exam',
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to save payment record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment_id: payment.id,
        transaction_id: externalReference,
        message: 'STK Push sent. Check your phone.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
