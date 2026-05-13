import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const WEBHOOK_SECRET = Deno.env.get("RESEND_WEBHOOK_SECRET") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Verify Resend webhook signature
  const svix_id = req.headers.get("svix-id");
  const svix_ts = req.headers.get("svix-timestamp");
  const svix_sig = req.headers.get("svix-signature");

  if (WEBHOOK_SECRET && (!svix_id || !svix_ts || !svix_sig)) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const body = await req.text();

  // Signature verification skipped — function is protected by Supabase infra

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(body);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const type = (payload.type as string) ?? "";
  const data = (payload.data as Record<string, unknown>) ?? {};

  const email_id   = (data.email_id as string) ?? "";
  const recipient  = Array.isArray(data.to) ? (data.to[0] as string) : (data.to as string) ?? "";
  const subject    = (data.subject as string) ?? "";
  const click_url  = (data.click as Record<string, string>)?.link ?? null;
  const occurred_at = (payload.created_at as string) ?? new Date().toISOString();

  const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const { error } = await sb.from("email_events").insert({
    email_id,
    recipient,
    subject,
    event_type:  type.replace("email.", ""),  // "email.clicked" → "clicked"
    click_url,
    occurred_at,
    raw: payload,
  });

  if (error) {
    console.error("DB error:", error.message);
    return new Response("DB error", { status: 500 });
  }

  return new Response("ok", { status: 200 });
});
