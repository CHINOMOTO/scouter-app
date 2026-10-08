const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://llgstbsndyyjcmcsiflu.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('--- 登録企業・加盟企業を100%架空企業名に更新 ---');

  // 1. 加盟企業 (companies) の更新
  const { data: companies, error: compErr } = await supabase
    .from('companies')
    .select('id, name');

  if (compErr) {
    console.error('Error fetching companies:', compErr);
  } else {
    for (const c of companies) {
      if (c.name.includes('アクロス') || c.name.includes('宇井建設')) {
        console.log(`Setting operating company: ${c.name} -> 株式会社宇井建設 (法人番号: 7012401040328)`);
        await supabase.from('companies').update({
          name: '株式会社宇井建設',
          corporate_number: '7012401040328',
          is_main: true
        }).eq('id', c.id);
      } else if (c.name.includes('ミヤエモン')) {
        console.log(`Renaming company: ${c.name} -> グランアクシス工営株式会社`);
        await supabase.from('companies').update({ name: 'グランアクシス工営株式会社' }).eq('id', c.id);
      }
    }
  }

  // 2. 企業信用案件 (credit_cases) の更新
  const { data: cases, error: casesErr } = await supabase
    .from('credit_cases')
    .select('id, company_name, counterparty_claim');

  if (casesErr) {
    console.error('Error fetching credit_cases:', casesErr);
  } else {
    for (const item of cases) {
      let newName = item.company_name;
      let newClaim = item.counterparty_claim || '';

      // 社名の架空化
      if (item.company_name.includes('大和建装')) {
        newName = '大同アーバン建装株式会社';
      } else if (item.company_name.includes('鈴木内装')) {
        newName = '鈴木内装（個人事業主）';
      } else if (item.company_name.includes('三陽重機土木')) {
        newName = 'サンライズ重機開発株式会社';
      } else if (item.company_name.includes('協和電設')) {
        newName = '協和テクノ電設株式会社';
      } else if (item.company_name.includes('北斗運輸')) {
        newName = '北斗エキスプレス運送株式会社';
      } else if (item.company_name.includes('丸信資材')) {
        newName = '有限会社マルシン建材';
      } else if (item.company_name.includes('美和工務店')) {
        newName = 'ミワ都市工務店合同会社';
      }

      // claim内の「一人親方」を「個人事業主」に変更
      if (newClaim.includes('一人親方')) {
        newClaim = newClaim.replace(/（一人親方）/g, '（個人事業主）').replace(/一人親方/g, '個人事業主');
      }

      if (newName !== item.company_name || newClaim !== item.counterparty_claim) {
        console.log(`Updating credit case: ${item.company_name} -> ${newName}`);
        await supabase
          .from('credit_cases')
          .update({
            company_name: newName,
            counterparty_claim: newClaim
          })
          .eq('id', item.id);
      }
    }
  }

  console.log('✅ 架空企業名への更新が完了しました');
}

main().catch(console.error);
