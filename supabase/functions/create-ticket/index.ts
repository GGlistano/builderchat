import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CreateTicketRequest {
  funnel_slug: string;
  lead_data: Record<string, any>;
  expiration_hours?: number;
  chat_base_url?: string;
}

interface CreateTicketResponse {
  success: boolean;
  ticket_code?: string;
  chat_url?: string;
  expires_at?: string;
  error?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Method not allowed. Use POST."
        }),
        {
          status: 405,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: CreateTicketRequest = await req.json();
    const { funnel_slug, lead_data, expiration_hours = 24, chat_base_url } = body;

    if (!funnel_slug || !lead_data) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: funnel_slug and lead_data"
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { data: funnel, error: funnelError } = await supabase
      .from("funnels")
      .select("id, name")
      .eq("slug", funnel_slug)
      .maybeSingle();

    if (funnelError || !funnel) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Funil não encontrado: ${funnel_slug}`
        }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { data: ticketCode, error: ticketCodeError } = await supabase
      .rpc("generate_ticket_code");

    if (ticketCodeError || !ticketCode) {
      throw new Error("Failed to generate ticket code");
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiration_hours);

    const clientIp = req.headers.get("x-forwarded-for") ||
                      req.headers.get("x-real-ip") ||
                      "unknown";

    const { data: ticket, error: insertError } = await supabase
      .from("lead_tickets")
      .insert({
        ticket_code: ticketCode,
        funnel_id: funnel.id,
        lead_data,
        expires_at: expiresAt.toISOString(),
        ip_address: clientIp,
      })
      .select()
      .single();

    if (insertError || !ticket) {
      throw new Error(`Failed to create ticket: ${insertError?.message}`);
    }

    const baseUrl = chat_base_url ||
                    Deno.env.get("CHAT_BASE_URL") ||
                    supabaseUrl;

    const chatUrl = `${baseUrl}/chat/${funnel_slug}?ticket=${ticketCode}`;

    const response: CreateTicketResponse = {
      success: true,
      ticket_code: ticketCode,
      chat_url: chatUrl,
      expires_at: expiresAt.toISOString(),
    };

    return new Response(
      JSON.stringify(response),
      {
        status: 201,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );

  } catch (error) {
    console.error("Error creating ticket:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error"
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
