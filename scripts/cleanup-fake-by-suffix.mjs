import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";
const envPath = resolve(process.cwd(), ".env.local");
readFileSync(envPath, "utf-8").split("\n").forEach(line => {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
});
const supabase = createClient("https://fzfkgemtaxsrocbucmza.supabase.co", process.env.SUPABASE_SERVICE_ROLE_KEY);

// 14人のline_id → 末尾8桁 → LINE_{suffix} で仮レコード検索
const lineIds = {
  "20260200565": "Ud7b3612cf826bf0a80ccec18f3d82601",
  "20260200568": "Ub0b6b520b4f9ca68bebcd633bbedc731",
  "20260200570": "Uc394d7f68650ae8456b37f131e8054e6",
  "20260200572": "U92b9bad9802a71ece1579d830e284fb0",
  "20260200576": "U798d662b5deaf72cc368085cb134fd6b",
  "20260200577": "U11d0a4644641d32ca42e61a9e4a1b8e1",
  "20260200580": "U41672153fe3b7b0ee7260ee9ad7e84e0",
  "20260200581": "U273e0d717f69d1d4b35454a00f3f63c7",
  "20260200582": "U926cb0ba8062dcfbb342d07482921c47",
  "20260200583": "U44d2e6cea1d11c6baf2a7ba06e8248a0",
  "20260200585": "U69e57ac3a054640df170d9c82e6d6df3",
  "20260200588": "Uce068ce8b1547c81e00b2f18596b92bf",
  "20260200591": "U729087c5dbfbe4b6d3d5df350ebe5667",
  "20260200592": "Ua0065c7540a779b75bedf3d9910b1622",
};

let deleted = 0;

for (const [pid, uid] of Object.entries(lineIds)) {
  const suffix = uid.slice(-8);
  const fakeId = `LINE_${suffix}`;

  const { data } = await supabase
    .from("intake")
    .select("patient_id, patient_name")
    .eq("patient_id", fakeId)
    .maybeSingle();

  if (data) {
    const { error } = await supabase
      .from("intake")
      .delete()
      .eq("patient_id", fakeId);
    if (error) {
      console.log(`FAIL ${fakeId} (${data.patient_name}) — ${error.message}`);
    } else {
      console.log(`DEL  ${fakeId} (${data.patient_name}) ← 本ID: ${pid}`);
      deleted++;
    }
  } else {
    console.log(`---  ${fakeId} なし ← ${pid}`);
  }
}

console.log(`\n=== 仮レコード削除: ${deleted}件 ===`);
