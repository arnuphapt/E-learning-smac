"use client";

import React, { useState } from "react";
import Icon from "@/components/ui/Icon";

// "ถาม AI" under one question of the tutor review: a small chat panel on /api/tutor/attempts/<attemptId>/explain.
// The server builds the question context itself (only the question id and the conversation are sent), so this panel
// holds nothing but the wording. The conversation lives in this component only (closing the page drops it; the server
// keeps a log row per answer for the shared daily quota).
const STARTER = "ช่วยอธิบายข้อนี้ให้หน่อย";
const ERRORS = {
  rate_limit_exceeded: "ใช้โควตา AI ของวันนี้ครบแล้ว ลองใหม่พรุ่งนี้",
  session_token_limit: "บทสนทนายาวเกินไป ปิดแล้วเปิดถาม AI ใหม่อีกครั้ง",
};

export default function AskAi({ attemptId, questionId }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]); // [{ role: "user" | "assistant", content }]
  const [input, setInput] = useState(STARTER);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setError("");
    setBusy(true);
    try {
      const r = await fetch("/api/tutor/attempts/" + encodeURIComponent(attemptId) + "/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId, messages: next }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.reply) {
        setError(ERRORS[d.error] || "AI ตอบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
        setMessages(messages); // the unanswered question is not part of the conversation
        setInput(text);
        return;
      }
      setMessages([...next, { role: "assistant", content: d.reply }]);
    } catch {
      setError("AI ตอบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      setMessages(messages);
      setInput(text);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className="clay-btn clay-btn-soft clay-btn-sm mt-3" onClick={() => setOpen(true)}>
        <Icon name="sparkle" size={14} style={{ color: "var(--primary)" }} />ถาม AI
      </button>
    );
  }
  return (
    <div className="clay-well mt-3" style={{ padding: 14 }}>
      <div className="flex items-center gap-2 mb-2">
        <Icon name="sparkle" size={15} style={{ color: "var(--primary)" }} />
        <b className="t-sm flex-1">ถาม AI เกี่ยวกับข้อนี้</b>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)} aria-label="ปิด"><Icon name="x" size={14} /></button>
      </div>
      <div className="flex col gap-2 mb-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className="t-sm pretty"
            style={{
              whiteSpace: "pre-wrap",
              padding: "10px 14px",
              borderRadius: 14,
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "92%",
              background: m.role === "user" ? "var(--primary-soft)" : "#ffffff",
              color: "var(--fg)",
              boxShadow: "0 2px 6px rgba(15,23,42,.04), inset 1px 1px 2px rgba(255,255,255,.9)",
            }}
          >
            {m.content}
          </div>
        ))}
        {busy && <div className="t-xs muted" style={{ color: "#64748b" }}>AI กำลังตอบ…</div>}
      </div>
      {error && <div className="t-xs mb-2" style={{ color: "var(--danger)" }} role="alert">{error}</div>}
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <input className="input flex-1" style={{ minWidth: 0, borderRadius: 12, background: "#ffffff" }} value={input} onChange={(e) => setInput(e.target.value)} maxLength={500} placeholder="พิมพ์คำถาม" aria-label="คำถามถึง AI" />
        <button type="submit" className="clay-btn clay-btn-primary clay-btn-sm" disabled={busy || !input.trim()}><Icon name="send" size={14} />ส่ง</button>
      </form>
    </div>
  );
}
