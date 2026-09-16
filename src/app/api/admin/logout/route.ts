import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE_NAME } from "@/middleware/adminAuth";

export const runtime = "nodejs";

/** POST /api/admin/logout — encerra a sessão do painel. */
export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(ADMIN_SESSION_COOKIE_NAME);
  return response;
}
