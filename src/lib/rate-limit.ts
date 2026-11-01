import "server-only";
import { createHmac } from "node:crypto";
import { adminClient } from "./supabase/admin";
export async function allowAuthAttempt(email: string, operation: string) {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) return false;
  const hash = createHmac("sha256", secret)
    .update(operation + ":" + email.trim().toLowerCase())
    .digest("hex");
  const { data, error } = await adminClient().rpc("consume_auth_attempt", {
    p_key_hash: hash,
  });
  if (error) throw new Error("AUTH_RATE_LIMIT_UNAVAILABLE");
  return data === true;
}
