// GAS側に問診データがあるか確認（2/1-2/7の問診未完了患者）
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, "../.env.local");
readFileSync(envPath, "utf-8").split("\n").forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, "");
});

const GAS_URL = process.env.GAS_MYPAGE_URL;

const targets = [
  "20260100110",  // 高橋優
  "20260100925",  // 中村 優菜
  "20260200197",  // 上田陽
  "20260200314",  // 山崎綾生
  "20260200346",  // 太刀川 椿姫
  "20260200444",  // 椛本 遥香
  "20260200453",  // 西角 亜祐
  "20260200458",  // 田中真樹
  "20260200504",  // 清水 天音
  "20260200549",  // 田中舞桜
  "20260200560",  // 武田叶夢
  "20260200562",  // 松田美優
  "20260200565",  // 工藤涼菜
  "20260200568",  // 白川春華
  "20260200570",  // 鈴木泰子
  "20260200571",  // 谷元由香
  "20260200572",  // 山口桃子
  "20260200576",  // 布施 澪幸
  "20260200577",  // 内山 南
  "20260200579",  // 内山 琴絵
  "20260200580",  // 土屋衣織
  "20260200581",  // 伊集菜帆
  "20260200582",  // 山下 あい
  "20260200583",  // 山本那乃芳
  "20260200585",  // 妹尾 美郁
  "20260200586",  // 菊池 愛奈
  "20260200587",  // 原田 美杏
];

console.log("=== GAS側の問診データ確認 ===\n");
console.log("patient_id | 氏名 | GAS hasIntake | GAS intakeId");
console.log("-".repeat(80));

for (const pid of targets) {
  try {
    const url = `${GAS_URL}?type=getDashboard&patient_id=${encodeURIComponent(pid)}&light=1`;
    const res = await fetch(url, { method: "GET" });
    const json = await res.json();
    const name = json.patient?.displayName || "";
    const hasIntake = json.hasIntake;
    const intakeId = json.intakeId || "";
    console.log(`${pid} | ${name} | ${hasIntake} | ${intakeId}`);
  } catch (e) {
    console.log(`${pid} | ERROR: ${e.message}`);
  }
}
