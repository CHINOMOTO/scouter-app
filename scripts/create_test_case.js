require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  // Find test user
  const { data: users } = await supabase.from('app_users').select('id, display_name, company_id').like('display_name', '%テスト%').limit(1);
  if (!users || users.length === 0) {
    console.error("Test user not found");
    return;
  }
  const testUser = users[0];

  // Insert case
  const { data: newCase, error: insertError } = await supabase
    .from("blacklist_cases")
    .insert([
      {
        registered_company_id: testUser.company_id,
        full_name: "悪質 テスト五郎",
        full_name_kana: "アクシツ テストゴロウ",
        gender: "male",
        birth_date: "1990-01-01",
        phone_last4: "9999",
        city: "東京都",
        occurrence_date: "2024-08-01",
        reason_text: "度重なる無断欠勤および現場での安全確認義務違反（テスト登録）",
        evidence_urls: [],
        status: "pending",
        registered_by_user_id: testUser.id,
      }
    ])
    .select()
    .single();

  if (insertError) {
    console.error("Failed to insert case:", insertError);
    return;
  }
  console.log("Case inserted:", newCase.id);

  // Send LINE Notification
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const adminUserId = process.env.LINE_ADMIN_USER_ID;

  if (token && adminUserId) {
    const messageText = `【MIERIS システム通知】\n\n🚨 新規のケース情報が登録されました。\n\n👤 対象者: 悪質 テスト五郎\n\n管理画面にログインして内容の確認と承認を行ってください。`;
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
          to: adminUserId,
          messages: [{ type: "text", text: messageText }]
      })
    });
    if (res.ok) {
        console.log("LINE notification sent!");
    } else {
        console.error("Failed to send LINE notification:", await res.text());
    }
  } else {
      console.log("Skipping LINE notification (no token)");
  }
}

run();
