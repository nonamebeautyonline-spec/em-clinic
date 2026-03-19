import type { ReactNode, CSSProperties } from "react";
import type { FlexNode, FlexBubble } from "./types";

// LINE Flex Bubble レンダラー
const FLEX_SIZE: Record<string, string> = { xxs: "10px", xs: "12px", sm: "13px", md: "14px", lg: "16px", xl: "18px", xxl: "22px", "3xl": "26px", "4xl": "32px", "5xl": "38px" };
const FLEX_MARGIN: Record<string, string> = { none: "0", xs: "2px", sm: "4px", md: "8px", lg: "12px", xl: "16px", xxl: "20px" };

/** Flex ノードを再帰的にレンダリング（boxレイアウト維持） */
export function renderFlexNode(node: FlexNode, idx: number, isHeader = false): ReactNode {
  if (!node) return null;
  const mt = node.margin ? FLEX_MARGIN[node.margin] || node.margin : undefined;

  if (node.type === "box") {
    const isHorizontal = node.layout === "horizontal";
    const s: CSSProperties = {
      display: "flex",
      flexDirection: isHorizontal ? "row" : "column",
      gap: node.spacing ? (FLEX_MARGIN[node.spacing] || node.spacing) : undefined,
    };
    if (mt) s.marginTop = mt;
    if (node.paddingAll) s.padding = node.paddingAll;
    if (isHorizontal) s.alignItems = "baseline";
    return (
      <div key={idx} style={s}>
        {(node.contents || []).map((c, i) => renderFlexNode(c, i, isHeader))}
      </div>
    );
  }

  if (node.type === "text") {
    const s: CSSProperties = { lineHeight: 1.5, minWidth: 0 };
    if (isHeader) { s.color = node.color || "#fff"; s.fontWeight = 700; s.fontSize = node.size ? (FLEX_SIZE[node.size] || node.size) : "16px"; }
    else {
      if (node.color) s.color = node.color;
      if (node.size) s.fontSize = FLEX_SIZE[node.size] || node.size;
      if (node.weight === "bold") s.fontWeight = 700;
      if (node.decoration === "line-through") s.textDecoration = "line-through";
      if (node.align) s.textAlign = node.align as CSSProperties["textAlign"];
    }
    if (mt) s.marginTop = mt;
    if (node.wrap) { s.whiteSpace = "pre-wrap"; s.wordBreak = "break-word"; } else { s.whiteSpace = "nowrap"; s.overflow = "hidden"; s.textOverflow = "ellipsis"; }
    if (node.flex !== undefined) s.flex = node.flex;
    return <div key={idx} style={s}>{node.text}</div>;
  }

  if (node.type === "image") {
    const s: CSSProperties = { maxWidth: "100%", display: "block" };
    if (mt) s.marginTop = mt;
    s.objectFit = node.aspectMode === "cover" ? "cover" : "contain";
    if (node.size === "full") s.width = "100%";
    if (node.aspectRatio) { const [w, h] = node.aspectRatio.split(":").map(Number); if (w && h) s.aspectRatio = `${w}/${h}`; }
    return <img key={idx} src={node.url} alt="" style={s} loading="lazy" />;
  }

  if (node.type === "separator") {
    return <div key={idx} style={{ borderTop: "1px solid #ddd", marginTop: mt || "8px" }} />;
  }

  if (node.type === "button") {
    const s: CSSProperties = { display: "block", width: "100%", padding: "10px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 600, fontSize: "14px", textAlign: "center", textDecoration: "none" };
    if (mt) s.marginTop = mt;
    if (node.style === "primary") { s.backgroundColor = node.color || "#06C755"; s.color = "#fff"; }
    else if (node.style === "secondary") { s.backgroundColor = "#f0f0f0"; s.color = node.color || "#333"; }
    else { s.backgroundColor = "transparent"; s.color = node.color || "#06C755"; }
    const label = node.action?.label || "ボタン";
    if (node.action?.type === "uri" && node.action?.uri) {
      return <a key={idx} href={node.action.uri} target="_blank" rel="noopener noreferrer" style={s}>{label}</a>;
    }
    return <div key={idx} style={s}>{label}</div>;
  }

  return null;
}

/** Flex Bubble をレンダリング（boxレイアウト維持、実際のLINE表示に近い外観） */
export function renderFlexBubble(bubble: FlexBubble): ReactNode {
  if (!bubble || bubble.type !== "bubble") return null;

  const hdrBg = bubble.header?.backgroundColor || "#ec4899";
  const hasHeader = bubble.header && (bubble.header.contents || []).length > 0;
  const hasBody = bubble.body && (bubble.body.contents || []).length > 0;
  const hasFooter = bubble.footer && (bubble.footer.contents || []).length > 0;

  return (
    <div className="rounded-xl overflow-hidden shadow-sm border border-gray-200 bg-white" style={{ minWidth: 200, maxWidth: 300 }}>
      {hasHeader && (
        <div style={{ backgroundColor: hdrBg, padding: bubble.header!.paddingAll || "12px 16px" }}>
          {(bubble.header!.contents || []).map((c, i) => renderFlexNode(c, i, true))}
        </div>
      )}
      {hasBody && (
        <div style={{ backgroundColor: "#ffffff", padding: bubble.body!.paddingAll || "16px" }}>
          {(bubble.body!.contents || []).map((c, i) => renderFlexNode(c, i))}
        </div>
      )}
      {hasFooter && (
        <div style={{ backgroundColor: "#ffffff", padding: bubble.footer!.paddingAll || "12px 16px" }}>
          {(bubble.footer!.contents || []).map((c, i) => renderFlexNode(c, i))}
        </div>
      )}
    </div>
  );
}
