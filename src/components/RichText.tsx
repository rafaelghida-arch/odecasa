import { Fragment } from "react";

/** Renderização mínima e segura (sem HTML) de listas, parágrafos e **negrito**. */
function inline(text: string, keyBase: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*\s][^*]*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4)
      return <strong key={`${keyBase}-${i}`} className="font-semibold">{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2)
      return <em key={`${keyBase}-${i}`}>{part.slice(1, -1)}</em>;
    return <Fragment key={`${keyBase}-${i}`}>{part}</Fragment>;
  });
}

export function RichText({ text }: { text: string }) {
  const blocks = text.replace(/\r/g, "").split(/\n{2,}/);
  return (
    <div className="space-y-3">
      {blocks.map((block, bi) => {
        const lines = block.split("\n").filter((l) => l.trim() !== "");
        const isOl = lines.length > 0 && lines.every((l) => /^\s*\d+[.)]\s+/.test(l));
        const isUl = lines.length > 0 && lines.every((l) => /^\s*[-•*]\s+/.test(l));
        if (isOl)
          return (
            <ol key={bi} className="list-decimal space-y-1.5 pl-5 marker:text-ink-3">
              {lines.map((l, li) => (
                <li key={li} className="pl-1">{inline(l.replace(/^\s*\d+[.)]\s+/, ""), `${bi}-${li}`)}</li>
              ))}
            </ol>
          );
        if (isUl)
          return (
            <ul key={bi} className="list-disc space-y-1.5 pl-5 marker:text-ink-3">
              {lines.map((l, li) => (
                <li key={li} className="pl-1">{inline(l.replace(/^\s*[-•*]\s+/, ""), `${bi}-${li}`)}</li>
              ))}
            </ul>
          );
        return (
          <p key={bi}>
            {lines.map((l, li) => (
              <Fragment key={li}>
                {li > 0 && <br />}
                {inline(l.replace(/^#+\s*/, ""), `${bi}-${li}`)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
