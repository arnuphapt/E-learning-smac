import type { ReactNode } from "react"
import { CopyButton } from "./copy-button"

function renderInline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i} className="font-bold text-foreground">{part.slice(2, -2)}</strong>
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="rounded-md border bg-muted px-1.5 py-0.5 font-mono text-[13px] text-foreground">
          {part.slice(1, -1)}
        </code>
      )
    }
    return part
  })
}

function CodeBlock({ code, language }: { code: string; language?: string }) {
  return (
    <div className="my-3 overflow-hidden rounded-lg border bg-muted/40 font-mono text-[13px]">
      <div className="flex items-center justify-between border-b bg-muted px-3 py-1 text-xs text-muted-foreground">
        <span className="lowercase">{language || "code"}</span>
        <CopyButton text={code} label="คัดลอกโค้ด" />
      </div>
      <pre className="overflow-x-auto p-4 leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  )
}

/** Small markdown subset of the AI reply: headings, bullet / numbered lines, code fences, bold and inline code. */
export function MarkdownText({ text }: { text?: string }) {
  if (!text) return null
  const lines = text.split("\n")
  const elements: ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const numbered = line.match(/^(\d+)\.\s(.*)/)

    if (line.startsWith("### ")) {
      elements.push(<div key={i} className="mt-3.5 mb-1.5 text-[14.5px] font-bold">{renderInline(line.slice(4))}</div>)
    } else if (line.startsWith("## ")) {
      elements.push(<div key={i} className="mt-4 mb-1.5 text-base font-bold">{renderInline(line.slice(3))}</div>)
    } else if (line.startsWith("# ")) {
      elements.push(<div key={i} className="mt-[18px] mb-2 text-lg font-bold">{renderInline(line.slice(2))}</div>)
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <div key={i} className="mt-1.5 flex items-start gap-2 pl-0.5">
          <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
          <span className="leading-relaxed">{renderInline(line.slice(2))}</span>
        </div>,
      )
    } else if (numbered) {
      elements.push(
        <div key={i} className="mt-1.5 flex items-start gap-2 pl-0.5">
          <span className="mt-px min-w-[18px] shrink-0 text-[13px] font-bold text-primary">{numbered[1]}.</span>
          <span className="leading-relaxed">{renderInline(numbered[2])}</span>
        </div>,
      )
    } else if (line.startsWith("```")) {
      const language = line.slice(3).trim()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i])
        i++
      }
      elements.push(<CodeBlock key={i} code={codeLines.join("\n")} language={language} />)
    } else if (line.trim() === "") {
      elements.push(<div key={i} className="h-2" />)
    } else {
      elements.push(<div key={i} className="mt-1 leading-[1.7]">{renderInline(line)}</div>)
    }
    i++
  }

  return <div className="text-[14.5px] tracking-[0.01em] text-foreground">{elements}</div>
}
