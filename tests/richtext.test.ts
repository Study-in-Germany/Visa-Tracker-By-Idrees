import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseInline, parseRichText, richTextToDoc, stripRichText } from "../lib/richtext";

const text = (v: string) => ({ t: "text", v });

describe("rich text parser", () => {
  it("parses bold and italic (standard Markdown)", () => {
    assert.deepEqual(parseInline("a **b** c"), [text("a "), { t: "b", c: [text("b")] }, text(" c")]);
    assert.deepEqual(parseInline("*it*"), [{ t: "i", c: [text("it")] }]);
    assert.deepEqual(parseInline("_it_"), [{ t: "i", c: [text("it")] }]);
    assert.deepEqual(parseInline("**bold _and italic_**"), [{ t: "b", c: [text("bold "), { t: "i", c: [text("and italic")] }] }]);
  });

  it("does not format snake_case, URLs or stray asterisks, and honours escapes", () => {
    assert.deepEqual(parseInline("my_file_name"), [text("my_file_name")]);
    assert.deepEqual(parseInline("https://x.de/a_b_c"), [text("https://x.de/a_b_c")]);
    assert.deepEqual(parseInline("2 * 3 * 4"), [text("2 * 3 * 4")]);
    assert.deepEqual(parseInline("\\*not bold\\*"), [text("*"), text("not bold"), text("*")]);
  });

  it("builds headings, lists and paragraphs", () => {
    const blocks = parseRichText("# Big\n## Small\n\nline one\\\nline two\n\n• a\n- b\n\n1. x\n2) y");
    assert.deepEqual(blocks.map((b) => b.t), ["h", "h", "p", "ul", "ol"]);
    assert.equal((blocks[0] as any).level, 1);
    assert.deepEqual((blocks[2] as any).c, [text("line one"), { t: "br" }, text("line two")]);
    assert.equal((blocks[3] as any).items.length, 2);
  });

  it("keeps HTML as literal text (the renderer never injects markup)", () => {
    const blocks = parseRichText("<img src=x onerror=alert(1)> **ok**");
    assert.equal((blocks[0] as any).c[0].v.startsWith("<img"), true);
  });

  it("strips markers for plain previews", () => {
    assert.equal(stripRichText("# Hi\n**bold** and _it_\n- one"), "Hi\nbold and it\none");
  });

  it("converts to the editor document with marks", () => {
    const doc = richTextToDoc("**b** and *i*\n\n- x");
    assert.equal(doc.content![0].content![0].marks![0].type, "bold");
    assert.equal(doc.content![0].content![2].marks![0].type, "italic");
    assert.equal(doc.content![1].type, "bulletList");
  });
});
