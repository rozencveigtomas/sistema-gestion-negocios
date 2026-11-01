import { NextResponse, type NextRequest } from "next/server";
import { supabase, isConfigured } from "@/lib/supabase/server";
import { safeNext } from "@/lib/validation";
export async function GET(request: NextRequest) {
  const origin = process.env.APP_URL || request.nextUrl.origin;
  const fail = () =>
    NextResponse.redirect(new URL("/acceso?error=link", origin));
  if (!isConfigured()) return fail();
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code"),
    tokenHash = searchParams.get("token_hash"),
    type = searchParams.get("type");
  // Default Supabase email links return a fragment, invisible to the server.
  // HTTP redirects inherit that fragment; the client removes it immediately.
  if (!code && !tokenHash && !searchParams.has("error"))
    return NextResponse.redirect(new URL("/auth/complete", origin));
  try {
    const db = await supabase();
    let error;
    if (code) ({ error } = await db.auth.exchangeCodeForSession(code));
    else if (tokenHash && (type === "invite" || type === "recovery"))
      ({ error } = await db.auth.verifyOtp({ token_hash: tokenHash, type }));
    else return fail();
    if (error) return fail();
    const {
      data: { user },
      error: userError,
    } = await db.auth.getUser();
    if (userError || !user) return fail();
    const { data: profile, error: profileError } = await db
      .from("profiles")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (profileError) return fail();
    if (!profile) {
      const { error: acceptError } = await db.rpc("accept_employee_invitation");
      if (acceptError) {
        await db.auth.signOut({ scope: "local" });
        return NextResponse.redirect(new URL("/sin-acceso", origin));
      }
    }
    const { error: logError } = await db.rpc("record_login");
    if (logError) {
      await db.auth.signOut({ scope: "local" });
      return fail();
    }
    return NextResponse.redirect(
      new URL(safeNext(searchParams.get("next")), origin),
    );
  } catch {
    return fail();
  }
}
