import { Fragment } from "react";
import { parseRichText, type Inline } from "@/lib/richtext";

function renderInline(nodes: Inline[]): React.ReactNode {
  return nodes.map((n, i) => {
    if (n.t === "text") return <Fragment key={i}>{n.v}</Fragment>;
    if (n.t === "br") return <br key={i} />;
    return n.t === "b" ? <strong key={i} className="font-semibold">{renderInline(n.c)}</strong> : <em key={i}>{renderInline(n.c)}</em>;
  });
}

/** Renders the listing description format as real elements. Nothing is parsed as HTML, so user text can't inject markup. */
export default function RichText({ value, className = "" }: { value: string; className?: string }) {
  return (
    <div className={`space-y-3 break-words text-[14px] leading-relaxed ${className}`}>
      {parseRichText(value).map((b, i) => {
        if (b.t === "h") return b.level === 1
          ? <h3 key={i} className="text-[18px] font-semibold leading-snug tracking-tight">{renderInline(b.c)}</h3>
          : <h4 key={i} className="text-[15px] font-semibold leading-snug">{renderInline(b.c)}</h4>;
        if (b.t === "p") return <p key={i}>{renderInline(b.c)}</p>;
        const Tag = b.t;
        return (
          <Tag key={i} className={`space-y-1 pl-5 ${b.t === "ul" ? "list-disc" : "list-decimal"}`}>
            {b.items.map((it, k) => <li key={k}>{renderInline(it)}</li>)}
          </Tag>
        );
      })}
    </div>
  );
}
