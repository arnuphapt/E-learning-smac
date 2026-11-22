import type { ReactNode } from "react"

function renderInline(text: string): ReactNode {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g).map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={idx} className="text-foreground">{part.slice(2, -2)}</strong>
    if (part.startsWith("*") && part.endsWith("*")) return <em key={idx}>{part.slice(1, -1)}</em>
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={idx} className="rounded bg-primary-soft px-1.5 py-0.5 font-mono text-[0.9em] text-primary">
          {part.slice(1, -1)}
        </code>
      )
    }
    return part
  })
}

/** Small markdown subset used by the persona prompt: headings, lists, quotes, code fences, bold/italic/inline code. */
export function MarkdownView({ text }: { text: string }) {
  if (!text) return null
  const lines = text.split("\n")
  const elements: ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const numbered = line.match(/^(\d+)\.\s(.*)/)

    if (line.startsWith("# ")) {
      elements.push(
        <h1 key={i} className="mb-3 mt-5 border-b pb-2 text-2xl font-extrabold text-primary">
          {renderInline(line.slice(2))}
        </h1>,
      )
    } else if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="mb-2.5 mt-4 text-xl font-bold text-primary">
          {renderInline(line.slice(3))}
        </h2>,
      )
    } else if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="mb-2 mt-3.5 text-base font-bold text-foreground">
          {renderInline(line.slice(4))}
        </h3>,
      )
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <div key={i} className="mt-1.5 flex gap-2.5 pl-2 leading-relaxed">
          <span className="shrink-0 font-bold text-primary">•</span>
          <span className="text-muted-foreground">{renderInline(line.slice(2))}</span>
        </div>,
      )
    } else if (numbered) {
      elements.push(
        <div key={i} className="mt-1.5 flex gap-2.5 pl-2 leading-relaxed">
          <span className="shrink-0 font-bold text-primary">{numbered[1]}.</span>
          <span className="text-muted-foreground">{renderInline(numbered[2])}</span>
        </div>,
      )
    } else if (line.startsWith("```")) {
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i])
        i++
      }
      elements.push(
        <pre key={i} className="my-3.5 overflow-x-auto rounded-lg bg-foreground p-4 font-mono text-[13px] text-background">
          {codeLines.join("\n")}
        </pre>,
      )
    } else if (line.startsWith("> ")) {
      elements.push(
        <blockquote key={i} className="my-3.5 border-l-4 border-primary pl-4 italic leading-relaxed text-muted-foreground">
          {renderInline(line.slice(2))}
        </blockquote>,
      )
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-3" />)
    } else {
      elements.push(
        <p key={i} className="my-1.5 leading-relaxed text-muted-foreground">
          {renderInline(line)}
        </p>,
      )
    }
    i++
  }

  return <div className="text-[14.5px]">{elements}</div>
}
