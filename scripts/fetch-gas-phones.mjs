// GASから8人の電話番号を取得
import { readFileSync } from "fs";
import { resolve } from "path";
const envPath = resolve(process.cwd(), ".env.local");
readFileSync(envPath, "utf-8").split("\n").forEach(line => {
  const m = line.match(/^([^=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
});

const GAS_URL = process.env.GAS_MYPAGE_URL;

const ids = [
  { id: "20260200565", name: "工藤涼菜" },
  { id: "20260200582", name: "山下 あい" },
  { id: "20260200583", name: "山本那乃芳" },
  { id: "20260200585", name: "妹尾　美郁" },
  { id: "20260200577", name: "内山 南" },
  { id: "20260200576", name: "布施　澪幸" },
  { id: "20260200580", name: "土屋衣織" },
  { id: "20260200346", name: "太刀川 椿姫" },
];

console.log("=== GASから電話番号を取得 ===\n");

for (const p of ids) {
  try {
    const res = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "mypage", patient_id: p.id }),
    });
    const json = await res.json();
    const tel = json?.tel || json?.phone || json?.patient?.tel || json?.patient?.phone || "";
    const name = json?.name || json?.patient?.name || "";
    const kana = json?.name_kana || json?.patient?.name_kana || "";
    const sex = json?.sex || json?.patient?.sex || "";
    const birth = json?.birth || json?.patient?.birth || "";
    console.log(`${p.id} | ${p.name}`);
    console.log(`  GAS name: ${name}, kana: ${kana}, sex: ${sex}, birth: ${birth}`);
    console.log(`  GAS tel: ${tel}`);
    // 全キーをダンプ
    const keys = Object.keys(json || {});
    if (keys.length > 0) {
      console.log(`  GAS keys: ${keys.join(", ")}`);
    }
    console.log("");
  } catch (e) {
    console.log(`${p.id} | ${p.name} -> ERROR: ${e.message}\n`);
  }
}
