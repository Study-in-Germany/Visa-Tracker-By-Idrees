/**
 * Listing descriptions are stored as plain Markdown text (what the Tiptap editor writes), so they are searchable and
 * can never carry HTML; the renderer builds React elements from the parsed tree.
 *
 *   **bold**   *italic* or _italic_
 *   # Large heading   ## Smaller heading
 *   - item  (also • item)   bulleted list        1. item   numbered list
 *   blank line = new paragraph, trailing backslash / single newline = line break, \* = literal asterisk
 */
export type Inline = { t: "text"; v: string } | { t: "b" | "i"; c: Inline[] } | { t: "br" };
export type Block =
  | { t: "h"; level: 1 | 2; c: Inline[] }
  | { t: "p"; c: Inline[] }
  | { t: "ul" | "ol"; items: Inline[][] };

// Alternatives, longest first: backslash escape, **bold**, *italic*, _italic_ (underscores only at word edges, so snake_case and URLs survive).
const INLINE =
  /\\([\\`*_{}[\]()#+\-.!>~|])|\*\*(?![\s*])([\s\S]+?)(?<![\s*])\*\*|\*(?![\s*])([^*\n]+?)(?<![\s*])\*|(?<![\p{L}\p{N}_])_(?![\s_])([^_\n]+?)(?<![\s_])_(?![\p{L}\p{N}_])/gu;

export function parseInline(src: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const m of src.matchAll(INLINE)) {
    if (m.index! > last) out.push({ t: "text", v: src.slice(last, m.index) });
    if (m[1] !== undefined) out.push({ t: "text", v: m[1] });
    else if (m[2] !== undefined) out.push({ t: "b", c: parseInline(m[2]) });
    else out.push({ t: "i", c: parseInline(m[3] ?? m[4]) });
    last = m.index! + m[0].length;
  }
  if (last < src.length) out.push({ t: "text", v: src.slice(last) });
  return out;
}

const withBreaks = (lines: string[]): Inline[] =>
  lines.flatMap((l, i) => (i === 0 ? parseInline(l) : [{ t: "br" } as Inline, ...parseInline(l)]));

const BULLET = /^\s*(?:[-•–]|\*(?=\s))\s+(.*)$/;
const NUMBER = /^\s*\d+[.)]\s+(.*)$/;
const HEADING = /^(#{1,2})\s+(.*)$/;

export function parseRichText(src: string): Block[] {
  const blocks: Block[] = [];
  const lines = src.replace(/\r\n?/g, "\n").split("\n");
  let para: string[] = [];
  let list: { t: "ul" | "ol"; items: Inline[][] } | null = null;

  const flushPara = () => { if (para.length) blocks.push({ t: "p", c: withBreaks(para) }); para = []; };
  const flushList = () => { if (list) blocks.push(list); list = null; };

  for (const line of lines) {
    const bullet = BULLET.exec(line), number = NUMBER.exec(line), heading = HEADING.exec(line);
    if (!line.trim()) { flushPara(); flushList(); }
    else if (heading) { flushPara(); flushList(); blocks.push({ t: "h", level: heading[1].length as 1 | 2, c: parseInline(heading[2]) }); }
    else if (bullet || number) {
      flushPara();
      const t = bullet ? "ul" : "ol";
      if (list && list.t !== t) flushList();
      list ??= { t, items: [] };
      list.items.push(parseInline((bullet ?? number)![1]));
    } else {
      flushList();
      para.push(line.replace(/(?<!\\)\\$/, "")); // a trailing backslash is how the editor writes a line break
    }
  }
  flushPara();
  flushList();
  return blocks;
}

/** Plain-text version (for previews and search snippets): markers removed. */
export function stripRichText(src: string): string {
  return parseRichText(src)
    .map((b) => {
      const flat = (nodes: Inline[]): string => nodes.map((n) => (n.t === "text" ? n.v : n.t === "br" ? "\n" : flat(n.c))).join("");
      return "items" in b ? b.items.map(flat).join("\n") : flat(b.c);
    })
    .join("\n");
}

// ── Conversion to the editor's document model (ProseMirror JSON), so stored text opens with its formatting intact ──
export type PMNode = { type: string; attrs?: Record<string, unknown>; content?: PMNode[]; text?: string; marks?: { type: string }[] };

function inlineToPM(nodes: Inline[], marks: { type: string }[] = []): PMNode[] {
  return nodes.flatMap((n): PMNode[] => {
    if (n.t === "text") return n.v ? [{ type: "text", text: n.v, ...(marks.length ? { marks } : {}) }] : [];
    if (n.t === "br") return [{ type: "hardBreak" }];
    return inlineToPM(n.c, [...marks, { type: n.t === "b" ? "bold" : "italic" }]);
  });
}

export function richTextToDoc(src: string): PMNode {
  const content = parseRichText(src).map((b): PMNode => {
    if (b.t === "h") return { type: "heading", attrs: { level: b.level }, content: inlineToPM(b.c) };
    if (b.t === "p") return { type: "paragraph", content: inlineToPM(b.c) };
    const item = (it: Inline[]): PMNode => ({ type: "listItem", content: [{ type: "paragraph", content: inlineToPM(it) }] });
    return b.t === "ul" ? { type: "bulletList", content: b.items.map(item) } : { type: "orderedList", attrs: { start: 1 }, content: b.items.map(item) };
  });
  return { type: "doc", content: content.length ? content : [{ type: "paragraph" }] };
}
