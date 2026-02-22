// flex_json のツリー構造をダンプして確認
require("dotenv").config({ path: __dirname + "/../.env.local" });
const { createClient } = require("@supabase/supabase-js");
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function walk(node, depth) {
  if (!node) return;
  const pad = "  ".repeat(depth);
  if (node.type === "text") {
    console.log(pad + "TEXT: \"" + (node.text || "").slice(0, 50) + "\"");
  } else if (node.type === "image") {
    console.log(pad + "IMAGE: " + (node.url || "").split("/").pop());
  } else if (node.type === "separator") {
    console.log(pad + "SEPARATOR");
  } else if (node.type === "button") {
    console.log(pad + "BUTTON: " + ((node.action && node.action.label) || ""));
  } else if (node.type === "box") {
    console.log(pad + "BOX(" + node.layout + ") [" + (node.contents || []).length + " children]");
    for (const c of (node.contents || [])) walk(c, depth + 1);
  }
}

function countLeaves(node) {
  if (!node) return 0;
  if (node.type !== "box") return 1;
  return (node.contents || []).reduce((s, c) => s + countLeaves(c), 0);
}

(async () => {
  const { data } = await sb.from("message_log").select("flex_json").eq("id", 11507).single();
  const bubble = data.flex_json;

  console.log("=== HEADER ===");
  walk(bubble.header, 0);
  console.log("\n=== BODY ===");
  walk(bubble.body, 0);
  console.log("\n=== FOOTER ===");
  walk(bubble.footer, 0);

  console.log("\nHeader leaves:", countLeaves(bubble.header));
  console.log("Body leaves:", countLeaves(bubble.body));
  console.log("Footer leaves:", countLeaves(bubble.footer));
})();
