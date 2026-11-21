import { NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/apiAuth";

export async function GET(request: Request) {
  try {
    const auth = await authenticateApiRequest(request, { requireAdmin: true });
    if (!auth.ok) return auth.response;

    const { supabaseAdmin } = auth;

    const [
      creditResult,
      casesResult,
      usersResult,
      companiesResult,
      inquiriesResult,
      auditResult,
    ] = await Promise.all([
      supabaseAdmin
        .from("credit_cases")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending"),
      supabaseAdmin
        .from("blacklist_cases")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending"),
      supabaseAdmin
        .from("app_users")
        .select("*", { count: "exact", head: true }),
      supabaseAdmin
        .from("companies")
        .select("*", { count: "exact", head: true }),
      supabaseAdmin
        .from("contact_inquiries")
        .select("*", { count: "exact", head: true })
        .eq("status", "unread"),
      supabaseAdmin
        .from("audit_logs")
        .select("*", { count: "exact", head: true }),
    ]);

    return NextResponse.json({
      pendingCreditCount: creditResult.error ? 0 : (creditResult.count ?? 0),
      pendingCaseCount: casesResult.error ? 0 : (casesResult.count ?? 0),
      userCount: usersResult.error ? 0 : (usersResult.count ?? 0),
      companyCount: companiesResult.error ? 0 : (companiesResult.count ?? 0),
      unreadInquiryCount: inquiriesResult.error ? 0 : (inquiriesResult.count ?? 0),
      auditCount: auditResult.error ? 0 : (auditResult.count ?? 0),
    });
  } catch (err) {
    console.error("Admin stats API error:", err);
    return NextResponse.json(
      { error: "統計情報の取得に失敗しました。" },
      { status: 500 }
    );
  }
}
