import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["volunteer", "admin"].includes(profile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as {
    familyId?: string;
    checkinSessionId?: string | null;
    templateKey?: string;
    messageBody?: string;
  };

  if (!body.familyId || !body.templateKey || !body.messageBody) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: family } = await admin
    .from("families")
    .select("id")
    .eq("id", body.familyId)
    .single();

  if (!family) {
    return NextResponse.json({ error: "Family not found." }, { status: 404 });
  }

  const { data: recipient } = await admin
    .from("family_memberships")
    .select("user_id")
    .eq("family_id", body.familyId)
    .order("is_primary_guardian", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sentAt = new Date().toISOString();
  const { data: notification, error: notificationError } = await admin
    .from("notifications")
    .insert({
      family_id: body.familyId,
      checkin_session_id: body.checkinSessionId ?? null,
      recipient_user_id: recipient?.user_id ?? null,
      recipient_phone: null,
      channel: "in_app",
      template_key: body.templateKey,
      message_body: body.messageBody,
      status: "sent",
      sent_at: sentAt,
      metadata: {
        delivery_method: "supabase_realtime",
        source: "dashboard_quick_alert",
      },
      created_by: user.id,
    })
    .select("*")
    .single();

  if (notificationError || !notification) {
    return NextResponse.json(
      { error: notificationError?.message || "Unable to queue notification." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, notificationId: notification.id, delivery: "in_app" });
}
