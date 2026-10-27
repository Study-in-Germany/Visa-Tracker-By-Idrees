"use client";

import { useEditor, useEditorState, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "tiptap-markdown";
import Icon from "./Icon";
import { richTextToDoc } from "@/lib/richtext";

type Btn = { id: string; title: string; label: React.ReactNode; run: (e: Editor) => void; active: (e: Editor) => boolean };

const BUTTONS: Btn[] = [
  { id: "bold", title: "Bold (Ctrl+B)", label: <span className="font-bold">B</span>, run: (e) => e.chain().focus().toggleBold().run(), active: (e) => e.isActive("bold") },
  { id: "italic", title: "Italic (Ctrl+I)", label: <span className="italic">I</span>, run: (e) => e.chain().focus().toggleItalic().run(), active: (e) => e.isActive("italic") },
  { id: "h1", title: "Large heading", label: <span className="text-[13px] font-bold">H1</span>, run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(), active: (e) => e.isActive("heading", { level: 1 }) },
  { id: "h2", title: "Smaller heading", label: <span className="text-[11px] font-bold">H2</span>, run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(), active: (e) => e.isActive("heading", { level: 2 }) },
  { id: "ul", title: "Bulleted list", label: <span className="text-base leading-none">•</span>, run: (e) => e.chain().focus().toggleBulletList().run(), active: (e) => e.isActive("bulletList") },
  { id: "ol", title: "Numbered list", label: <span className="text-[12px] font-semibold">1.</span>, run: (e) => e.chain().focus().toggleOrderedList().run(), active: (e) => e.isActive("orderedList") },
];

/**
 * WYSIWYG editor (Tiptap): bold, italic, two heading sizes, bulleted and numbered lists, undo/redo.
 * The value is exchanged as Markdown text, which is what gets stored and later rendered by <RichText>.
 * Fixed height with internal scrolling, so the form layout never jumps while typing.
 */
export default function RichTextEditor({ id, value, onChange, maxLength = 2000, placeholder, error }: { id: string; value: string; onChange: (markdown: string) => void; maxLength?: number; placeholder?: string; error?: string }) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      // Only the formats the toolbar offers; links, code, quotes etc. are switched off.
      StarterKit.configure({ heading: { levels: [1, 2] }, link: false, underline: false, code: false, codeBlock: false, blockquote: false, strike: false, horizontalRule: false }),
      Markdown.configure({ html: false, breaks: false, bulletListMarker: "-", transformPastedText: false }),
      Placeholder.configure({ placeholder: placeholder ?? "" }),
    ],
    content: richTextToDoc(value),
    editorProps: { attributes: { id, class: "rt-editor-content", "aria-label": "Description" } },
    onUpdate: ({ editor }) => onChange((editor.storage as any).markdown.getMarkdown().trim()),
  });

  // Which buttons are active/disabled follows the selection.
  const state = useEditorState({
    editor,
    selector: (ctx) => ({
      active: BUTTONS.map((b) => (ctx.editor ? b.active(ctx.editor) : false)),
      canUndo: ctx.editor?.can().undo() ?? false,
      canRedo: ctx.editor?.can().redo() ?? false,
    }),
  });

  const over = value.length > maxLength;
  return (
    <div className={`overflow-hidden rounded-lg border bg-paper-raised ${error || over ? "border-red-400" : "border-line-strong focus-within:border-ink-600 focus-within:ring-1 focus-within:ring-ink-600"}`}>
      <div role="toolbar" aria-label="Formatting" className="flex flex-wrap items-center gap-0.5 border-b border-line bg-paper-sunk/50 px-1.5 py-1">
        {BUTTONS.map((b, i) => (
          <button key={b.id} type="button" title={b.title} aria-label={b.title} aria-pressed={state?.active[i] ?? false} disabled={!editor} onMouseDown={(e) => e.preventDefault()} onClick={() => editor && b.run(editor)}
            className={`grid h-8 min-w-[32px] place-items-center rounded-md px-1.5 text-ink-800 transition-colors hover:bg-paper ${state?.active[i] ? "bg-ink-800 !text-paper-raised hover:bg-ink-800" : ""}`}>
            {b.label}
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-line-strong" aria-hidden="true" />
        <button type="button" title="Undo" aria-label="Undo" disabled={!state?.canUndo} onMouseDown={(e) => e.preventDefault()} onClick={() => editor?.chain().focus().undo().run()} className="grid h-8 w-8 place-items-center rounded-md text-ink-800 hover:bg-paper disabled:opacity-35"><Icon name="arrowLeft" size={15} /></button>
        <button type="button" title="Redo" aria-label="Redo" disabled={!state?.canRedo} onMouseDown={(e) => e.preventDefault()} onClick={() => editor?.chain().focus().redo().run()} className="grid h-8 w-8 place-items-center rounded-md text-ink-800 hover:bg-paper disabled:opacity-35"><Icon name="arrowRight" size={15} /></button>
        <span className={`ml-auto px-2 text-[11px] tabular-nums ${over ? "font-semibold text-red-700" : "text-mute"}`}>{value.length}/{maxLength}</span>
      </div>
      <EditorContent editor={editor} className="rt-editor" />
    </div>
  );
}
