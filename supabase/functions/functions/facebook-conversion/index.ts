import { createClient } from "npm:@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.177.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PurchaseEventRequest {
  ticket_id: string;
  event_name: string;
  value?: number;
  currency?: string;
  email?: string;
  phone?: string;
  first_name?: string;
}

async function hashSHA256(value: string): Promise<string> {
  if (!value) return "";

  const msgBuffer = new TextEncoder().encode(value.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function buildFbc(fbclid: string, capturedAt: Date): string {
  const ts = Math.floor(capturedAt.getTime() / 1000);
  return `fb.1.${ts}.${fbclid}`;
}

function validateAndFixFbc(
  fbc: string | null,
  fbclid: string | null,
  ticketCreatedAt: string
): string | null {
  if (fbc && fbc.startsWith("fb.1.")) {
    return fbc;
  }

  if (fbclid) {
    const capturedAt = new Date(ticketCreatedAt);
    return buildFbc(fbclid, capturedAt);
  }

  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body: PurchaseEventRequest = await req.json();
    const { ticket_id, event_name, value, currency = "MZN", email, phone, first_name } = body;

    if (!ticket_id) {
      return new Response(
        JSON.stringify({ success: false, error: "ticket_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: ticket, error: ticketError } = await supabase
      .from("lead_tickets")
      .select("*, funnels!inner(id, facebook_pixel_id, facebook_capi_token, facebook_test_event_code)")
      .eq("id", ticket_id)
      .maybeSingle();

    if (ticketError || !ticket) {
      return new Response(
        JSON.stringify({ success: false, error: "Ticket not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const funnel = ticket.funnels;

    if (!funnel.facebook_pixel_id || !funnel.facebook_capi_token) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Facebook Pixel ID or CAPI Token not configured for this funnel",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!ticket.is_paid || !ticket.paid_amount) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Ticket is not marked as paid or has no amount",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const eventTime = Math.floor(
      (ticket.paid_at ? new Date(ticket.paid_at).getTime() : Date.now()) / 1000
    );
    const eventId = `${ticket_id}_${eventTime}`;

    const userData: any = {};

    if (ticket.ip_address && ticket.ip_address !== "unknown") {
      userData.client_ip_address = ticket.ip_address;
    }

    if (ticket.user_agent) {
      userData.client_user_agent = ticket.user_agent;
    }

    if (email) {
      userData.em = [await hashSHA256(email)];
    }

    if (phone) {
      userData.ph = [await hashSHA256(phone.replace(/\D/g, ""))];
    }

    if (first_name) {
      userData.fn = [await hashSHA256(first_name)];
    }

    const validFbc = validateAndFixFbc(ticket.fbc, ticket.fbclid, ticket.created_at);
    if (validFbc) {
      userData.fbc = validFbc;
    }

    if (ticket.fbp) {
      userData.fbp = ticket.fbp;
    }

    const customData: any = {
      currency: currency,
      value: value || parseFloat(ticket.paid_amount),
    };

    if (ticket.utm_source) customData.utm_source = ticket.utm_source;
    if (ticket.utm_medium) customData.utm_medium = ticket.utm_medium;
    if (ticket.utm_campaign) customData.utm_campaign = ticket.utm_campaign;
    if (ticket.utm_content) customData.utm_content = ticket.utm_content;
    if (ticket.utm_term) customData.utm_term = ticket.utm_term;

    const eventData: any = {
      data: [
        {
          event_name: event_name,
          event_time: eventTime,
          event_id: eventId,
          event_source_url: ticket.first_landing_page || undefined,
          action_source: "website",
          user_data: userData,
          custom_data: customData,
        },
      ],
    };

    if (funnel.facebook_test_event_code) {
      eventData.test_event_code = funnel.facebook_test_event_code;
    }

    const apiUrl = `https://graph.facebook.com/v21.0/${funnel.facebook_pixel_id}/events?access_token=${funnel.facebook_capi_token}`;

    const fbResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventData),
    });

    const fbResult = await fbResponse.json();

    if (!fbResponse.ok) {
      console.error("Facebook API Error:", fbResult);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to send event to Facebook",
          details: fbResult,
        }),
        {
          status: fbResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        facebook_response: fbResult,
        event_id: eventId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
