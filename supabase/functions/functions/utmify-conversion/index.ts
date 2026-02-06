import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface UtmifyEventRequest {
  ticket_id: string;
  status: "waiting_payment" | "paid";
  amount: number;
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

    const body: UtmifyEventRequest = await req.json();
    const { ticket_id, status, amount } = body;

    if (!ticket_id || !status || !amount) {
      return new Response(
        JSON.stringify({ success: false, error: "ticket_id, status, and amount are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: ticket, error: ticketError } = await supabase
      .from("lead_tickets")
      .select("*, funnels!inner(id, name, utmify_api_token)")
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

    if (!funnel.utmify_api_token) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Utmify API Token not configured for this funnel",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const leadData = ticket.lead_data as any || {};
    const nome = leadData.nome || leadData.name || "Cliente";
    const email = leadData.email || "cliente@exemplo.com";
    const phone = leadData.telefone || leadData.phone || leadData.whatsapp || "";

    const valorMZN = parseInt(amount.toString());
    const valorUSD = Math.round((valorMZN / 64) * 100);

    const agora = new Date();
    const orderId = ticket_id;

    let productId = "produto-generico";
    let productName = funnel.name || "Produto";

    if (orderId.startsWith('UP1-') || orderId.includes('upsell')) {
      productId = "turbo-cash-ia";
      productName = "Turbo Cash IA";
    } else if (orderId.includes("upsell2") || orderId.startsWith("UP2-")) {
      productId = "ROBO-DINHEIRO";
      productName = "Robo do Dinheiro";
    } else if (orderId.includes("upsell3") || orderId.startsWith("UP3-")) {
      productId = "ckub-cash";
      productName = "CLUBE CASH PRIME";
    } else if (orderId.startsWith("ED-")) {
      productId = "TRUCO-DO-SAL";
      productName = "Truco do Sal";
    } else if (orderId.startsWith("SPOTIFY") || funnel.name?.includes("SPOTIFY")) {
      productId = "SPOTIFY";
      productName = "SPOTIFY";
    }

    const dadosEvento: any = {
      orderId,
      platform: "VisionPub",
      paymentMethod: "pix",
      status: status,
      createdAt: agora.toISOString().replace('T', ' ').substring(0, 19),
      approvedDate: status === "paid" ? agora.toISOString().replace('T', ' ').substring(0, 19) : null,
      refundedAt: null,
      customer: {
        name: nome,
        email: email,
        phone: phone,
        document: null,
        country: "MZ",
        ip: ticket.ip_address || "102.0.0.1"
      },
      products: [{
        id: productId,
        name: productName,
        planId: null,
        planName: null,
        quantity: 1,
        priceInCents: valorUSD
      }],
      trackingParameters: {
        utm_source: ticket.utm_source || null,
        utm_campaign: ticket.utm_campaign || null,
        utm_medium: ticket.utm_medium || null,
        utm_content: ticket.utm_content || null,
        utm_term: ticket.utm_term || null,
        src: null,
        sck: null
      },
      commission: {
        totalPriceInCents: valorUSD,
        gatewayFeeInCents: 0,
        userCommissionInCents: valorUSD,
        currency: "USD"
      },
      isTest: false
    };

    const utmifyResponse = await fetch("https://api.utmify.com.br/api-credentials/orders", {
      method: "POST",
      headers: {
        "x-api-token": funnel.utmify_api_token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(dadosEvento),
    });

    const utmifyResult = await utmifyResponse.json();

    if (!utmifyResponse.ok) {
      console.error("Utmify API Error:", utmifyResult);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to send event to Utmify",
          details: utmifyResult,
        }),
        {
          status: utmifyResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        utmify_response: utmifyResult,
        order_id: orderId,
        conversion_info: {
          mzn: valorMZN,
          usd: (valorUSD / 100).toFixed(2),
          product: productName
        }
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
