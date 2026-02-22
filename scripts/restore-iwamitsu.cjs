// 岩満春香 (20251200554) の intake + answerers レコード復旧
require("dotenv").config({ path: __dirname + "/../.env.local" });
const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  // intake 復旧
  const { data, error } = await sb.from("intake").insert({
    reserve_id: "resv-1766816098690",
    patient_id: "20251200554",
    answerer_id: "229729279",
    line_id: "U89c0e6f92bdb801017f63d68589991a8",
    patient_name: "岩満　春香",
    answers: {
      name: "岩満　春香",
      name_kana: "イワミツ　ハルカ",
      sex: "女",
      birth: "2003/04/15",
      tel: "09013694167",
      ng_check: "no",
      current_disease_yesno: "no",
      current_disease_detail: "",
      glp_history: "マンジャロ2.5mg,5mg,7.5mg",
      med_yesno: "no",
      med_detail: "",
      allergy_yesno: "no",
      allergy_detail: "",
      entry_route: "twitter",
      entry_other: "",
    },
    reserved_date: "2025-12-27",
    reserved_time: "15:45:00",
    status: "OK",
    note: "2025年12月27日15時45分\nGLP-1 使用歴\nマンジャロ2.5mg,5mg,7.5mg\n嘔気・嘔吐や低血糖に関する副作用の説明を行った。\n使用方法に関して説明を実施し、パンフレットの案内を行った。\n以上より上記の用量の処方を行う方針とした。",
    prescription_menu: "5mg",
    created_at: "2025-12-21T01:07:58.762Z",
  }).select("id, patient_id, patient_name").single();

  if (error) {
    console.error("intake挿入エラー:", error.message);
    return;
  }
  console.log("intake復旧完了:", JSON.stringify(data));

  // answerers 復旧
  const { data: ans } = await sb.from("answerers")
    .select("patient_id, name, line_id")
    .eq("patient_id", "20251200554");

  if (!ans || ans.length === 0) {
    const { error: aErr } = await sb.from("answerers").insert({
      patient_id: "20251200554",
      name: "岩満　春香",
      line_id: "U89c0e6f92bdb801017f63d68589991a8",
    });
    console.log("answerers復旧:", aErr ? aErr.message : "OK");
  } else {
    console.log("answerers: 既存あり");
  }
})();
