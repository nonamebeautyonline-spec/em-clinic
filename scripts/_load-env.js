// .env.local を process.env に読み込む（スクリプト用）
const fs = require("fs");
const path = require("path");
const envPath = path.resolve(__dirname, "../.env.local");
const envContent = fs.readFileSync(envPath, "utf8");
for (const line of envContent.split("\n")) {
  const m = line.match(/^([A-Za-z_][A-Za-z_0-9]*)=["']?(.*)["']?$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/["']$/, "");
}
