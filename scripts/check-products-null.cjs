const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const envContent = fs.readFileSync(path.resolve(__dirname, "../.env.local"), "utf-8");
const env = {};
envContent.split("\n").forEach((l) => {
  const t = l.trim();
  if (!t || t.startsWith("#")) return;
  const i = t.indexOf("=");
  if (i === -1) return;
  let v = t.substring(i + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  env[t.substring(0, i).trim()] = v;
});
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data: nullProducts } = await sb.from("products").select("id, code, name").is("tenant_id", null);
  const { data: setProducts } = await sb.from("products").select("id, code, name").not("tenant_id", "is", null);
  console.log("NULL products (" + (nullProducts?.length || 0) + "):");
  nullProducts?.forEach(p => console.log("  ", p.id, p.code, p.name));
  console.log("SET products (" + (setProducts?.length || 0) + "):");
  setProducts?.forEach(p => console.log("  ", p.id, p.code, p.name));

  // 同じ code が両方にあるか確認
  const nullCodes = new Set(nullProducts?.map(p => p.code) || []);
  const setCodes = new Set(setProducts?.map(p => p.code) || []);
  const overlap = [...nullCodes].filter(c => setCodes.has(c));
  console.log("\n重複コード:", overlap.length, "件 →", overlap.join(", "));

  if (overlap.length === nullProducts?.length) {
    console.log("→ NULL の全件がテナント付きで重複あり。安全に削除可能。");
    if (process.argv.includes("--delete")) {
      const ids = nullProducts.map(p => p.id);
      const { error } = await sb.from("products").delete().in("id", ids);
      if (error) console.error("削除エラー:", error.message);
      else console.log("削除完了:", ids.length, "件");
    }
  }
}
main().catch(console.error);
