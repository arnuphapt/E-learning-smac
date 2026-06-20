"use client";

import React, { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import Icon from "@/components/ui/Icon";

// ---- Simple markdown renderer (bold, bullets, code) ----
function MarkdownText({ text }) {
  if (!text) return null;

  const lines = text.split("\n");
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Heading ##
    if (line.startsWith("## ")) {
      elements.push(
        <div key={i} style={{ fontWeight: 700, fontSize: 14, marginTop: 10, marginBottom: 4, color: "var(--primary)" }}>
          {renderInline(line.slice(3))}
        </div>
      );
    } else if (line.startsWith("# ")) {
      elements.push(
        <div key={i} style={{ fontWeight: 700, fontSize: 15, marginTop: 10, marginBottom: 4 }}>
          {renderInline(line.slice(2))}
        </div>
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <div key={i} style={{ display: "flex", gap: 6, marginTop: 2 }}>
          <span style={{ color: "var(--primary)", marginTop: 2, flexShrink: 0 }}>•</span>
          <span>{renderInline(line.slice(2))}</span>
        </div>
      );
    } else if (line.startsWith("```")) {
      // code block
      let codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <pre key={i} style={{
          background: "var(--muted)", borderRadius: 8, padding: "8px 12px",
          fontSize: 12, overflowX: "auto", margin: "6px 0", fontFamily: "monospace"
        }}>
          {codeLines.join("\n")}
        </pre>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={i} style={{ height: 4 }} />);
    } else {
      elements.push(
        <div key={i} style={{ marginTop: 2, lineHeight: 1.6 }}>
          {renderInline(line)}
        </div>
      );
    }
    i++;
  }

  return <div style={{ fontSize: 13.5 }}>{elements}</div>;
}

function renderInline(text) {
  // bold **text**
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} style={{
          background: "var(--muted)", borderRadius: 4, padding: "1px 5px",
          fontFamily: "monospace", fontSize: 12
        }}>
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

// ---- Typing animation dots ----
function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center", padding: "6px 2px" }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{
          width: 6, height: 6, borderRadius: "50%",
          background: "var(--primary)", opacity: 0.7,
          animation: `aiTypingDot 1.2s ${i * 0.2}s infinite ease-in-out`
        }} />
      ))}
    </div>
  );
}

const SUGGESTIONS = [
  "สรุปเนื้อหาบทเรียนนี้ให้หน่อย",
  "อธิบายจุดสำคัญของบทเรียนนี้",
  "มีแนวคิดอะไรที่ยากในบทเรียนนี้บ้าง?",
  "ช่วยยกตัวอย่างให้เข้าใจง่ายขึ้นหน่อย",
];

export default function AiChat({ lesson, course, open, onClose }) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [showAttachmentDropdown, setShowAttachmentDropdown] = useState(false);
  
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const attachmentRef = useRef(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      const timer = setTimeout(() => {
        setMessages([
          {
            role: "assistant",
            content: `สวัสดีครับ! ผมคือ AI ผู้ช่วยสำหรับบทเรียน **"${lesson?.title || "บทเรียนนี้"}"** 🎓\n\nคุณสามารถถามคำถามเกี่ยวกับเนื้อหา ขอให้อธิบายเพิ่มเติม หรือกดปุ่ม **"สรุปบทเรียน"** เพื่อให้ผมสรุปเนื้อหาให้ได้เลยครับ`,
          },
        ]);
      }, 0);
      return () => clearTimeout(timer);
    }
    if (open) {
      const focusTimer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(focusTimer);
    }
  }, [open, lesson?.title, messages.length]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (attachmentRef.current && !attachmentRef.current.contains(event.target)) {
        setShowAttachmentDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const lessonContext = lesson
    ? {
        id: lesson.id,
        courseId: course?.id || lesson.course_id,
        title: lesson.title,
        index: lesson.index,
        courseCode: course?.code,
        courseName: course?.title,
        description: lesson.description,
        duration: lesson.duration,
      }
    : null;

  const sendMessage = async (userText, mode = "chat") => {
    let finalUserText = userText;
    const currentAttachments = mode === "chat" ? attachedFiles : [];

    if (!finalUserText.trim() && mode !== "summarize") {
      if (currentAttachments.length > 0) {
        finalUserText = "ช่วยอธิบายเนื้อหาหรือตอบคำถามจากเอกสารประกอบการเรียนที่แนบมานี้ให้หน่อยครับ/ค่ะ";
      } else {
        return;
      }
    }

    const newMessages = [
      ...messages,
      { role: "user", content: finalUserText, attachments: currentAttachments },
    ];

    if (mode === "chat") {
      setMessages(newMessages);
      setInput("");
      setAttachedFiles([]);
    } else {
      setSummarizing(true);
    }
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          lessonContext,
          mode,
          studentId: session?.dbId || session?.user?.id,
          attachments: currentAttachments,
        }),
      });

      const data = await res.json();
      const reply = data.reply || "ขออภัย ไม่สามารถตอบได้ในขณะนี้";

      if (mode === "summarize") {
        setMessages([
          ...messages,
          { role: "user", content: "📋 ขอสรุปเนื้อหาบทเรียนนี้" },
          { role: "assistant", content: reply },
        ]);
        setSummarizing(false);
      } else {
        setMessages([...newMessages, { role: "assistant", content: reply }]);
      }
    } catch (err) {
      const errMsg = "ขออภัย เกิดข้อผิดพลาดในการเชื่อมต่อ AI กรุณาลองใหม่อีกครั้ง";
      if (mode === "summarize") {
        setMessages([
          ...messages,
          { role: "user", content: "📋 ขอสรุปเนื้อหาบทเรียนนี้" },
          { role: "assistant", content: errMsg },
        ]);
        setSummarizing(false);
      } else {
        setMessages([...newMessages, { role: "assistant", content: errMsg }]);
      }
    }
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  if (!open) return null;

  return (
    <>
      {/* Overlay for mobile */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 998,
          background: "rgba(0,0,0,0.3)",
          display: "none",
        }}
        className="ai-chat-overlay"
      />

      <div style={{
        position: "fixed",
        bottom: 88,
        right: 24,
        width: 400,
        maxWidth: "calc(100vw - 32px)",
        height: 560,
        maxHeight: "calc(100vh - 120px)",
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 20,
        boxShadow: "0 24px 80px rgba(0,0,0,0.18), 0 8px 24px rgba(0,0,0,0.1)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        zIndex: 999,
        animation: "aiChatSlideIn 0.25s cubic-bezier(0.34,1.56,0.64,1)",
      }}>
        {/* Header */}
        <div style={{
          padding: "14px 16px",
          borderBottom: "1px solid var(--border)",
          background: "linear-gradient(135deg, var(--primary) 0%, #0891b2 100%)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexShrink: 0,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "rgba(255,255,255,0.2)",
            display: "grid", placeItems: "center",
            flexShrink: 0,
          }}>
            <Icon name="sparkle" size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>AI ผู้ช่วยสอน</div>
            <div style={{ fontSize: 11.5, opacity: 0.85 }} className="truncate">
              {lesson?.title ? `บทที่ ${lesson.index} · ${lesson.title}` : "Powered by Gemini"}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 30, height: 30, borderRadius: 8, border: 0,
              background: "rgba(255,255,255,0.15)", color: "#fff",
              cursor: "pointer", display: "grid", placeItems: "center",
              flexShrink: 0,
            }}
            title="ปิด"
          >
            <Icon name="x" size={16} />
          </button>
        </div>

        {/* Quick actions */}
        <div style={{
          padding: "8px 12px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          gap: 6,
          flexShrink: 0,
          overflowX: "auto",
        }}>
          <button
            onClick={() => sendMessage("", "summarize")}
            disabled={loading || summarizing}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "5px 12px", borderRadius: 20, border: "1px solid var(--primary)",
              background: "var(--primary-soft)", color: "var(--primary)",
              fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
              opacity: (loading || summarizing) ? 0.6 : 1,
              flexShrink: 0,
            }}
          >
            <Icon name="sparkle" size={13} />
            {summarizing ? "กำลังสรุป..." : "สรุปบทเรียน"}
          </button>
          {messages.length <= 1 && SUGGESTIONS.slice(1).map((s, i) => (
            <button
              key={i}
              onClick={() => sendMessage(s)}
              disabled={loading}
              style={{
                padding: "5px 12px", borderRadius: 20, border: "1px solid var(--border)",
                background: "var(--bg)", color: "var(--fg)",
                fontSize: 12, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
                opacity: loading ? 0.6 : 1,
              }}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                gap: 8,
                alignItems: "flex-end",
              }}
            >
              {msg.role === "assistant" && (
                <div style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  background: "linear-gradient(135deg, var(--primary), #0891b2)",
                  display: "grid", placeItems: "center", color: "#fff",
                  marginBottom: 2,
                }}>
                  <Icon name="sparkle" size={13} />
                </div>
              )}
              <div style={{
                maxWidth: "80%",
                padding: "9px 13px",
                borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                background: msg.role === "user"
                  ? "linear-gradient(135deg, var(--primary), #0891b2)"
                  : "var(--muted)",
                color: msg.role === "user" ? "#fff" : "var(--fg)",
                fontSize: 13.5,
                lineHeight: 1.5,
              }}>
                {msg.role === "assistant" ? (
                  <MarkdownText text={msg.content} />
                ) : (
                  <div>
                    <div>{msg.content}</div>
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6, borderTop: "1px dashed rgba(255,255,255,0.3)", paddingTop: 6 }}>
                        {msg.attachments.map((f, idx) => (
                          <a
                            key={idx}
                            href={f.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 6,
                              fontSize: 11.5,
                              color: "#fff",
                              opacity: 0.95,
                              textDecoration: "underline"
                            }}
                          >
                            <Icon name="file" size={11} />
                            <span className="truncate" style={{ maxWidth: 160 }}>{f.name}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && !summarizing && (
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                background: "linear-gradient(135deg, var(--primary), #0891b2)",
                display: "grid", placeItems: "center", color: "#fff",
              }}>
                <Icon name="sparkle" size={13} />
              </div>
              <div style={{
                padding: "9px 13px",
                borderRadius: "16px 16px 16px 4px",
                background: "var(--muted)",
              }}>
                <TypingDots />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{
          borderTop: "1px solid var(--border)",
          background: "var(--card)",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          position: "relative"
        }}>
          {/* Document attachment selector dropdown */}
          {showAttachmentDropdown && (
            <div ref={attachmentRef} className="card shadow-lg" style={{
              position: "absolute",
              bottom: "100%",
              left: 12,
              zIndex: 1000,
              width: 280,
              maxHeight: 200,
              overflowY: "auto",
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 8,
              display: "flex",
              flexDirection: "column",
              gap: 4,
              marginBottom: 6,
              animation: "selectFadeIn 0.15s cubic-bezier(0.16, 1, 0.3, 1)"
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--subtle)", textTransform: "uppercase", padding: "4px 8px" }}>
                แนบเอกสารจากบทเรียน:
              </div>
              {(lesson?.documents || []).map((doc, idx) => {
                const isAttached = attachedFiles.some(f => f.url === doc.url);
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={isAttached}
                    onClick={() => {
                      setAttachedFiles([...attachedFiles, doc]);
                      setShowAttachmentDropdown(false);
                    }}
                    style={{
                      border: 0,
                      background: "transparent",
                      color: "var(--fg)",
                      padding: "8px 10px",
                      borderRadius: 8,
                      fontSize: 12.5,
                      cursor: isAttached ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      width: "100%",
                      textAlign: "left",
                      opacity: isAttached ? 0.5 : 1
                    }}
                    onMouseOver={(e) => { if (!isAttached) e.currentTarget.style.background = "var(--muted)"; }}
                    onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <Icon name="file" size={14} className="muted" />
                    <span className="truncate flex-1">{doc.name}</span>
                    {isAttached && <Icon name="check" size={12} className="success" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Render chips for attached files */}
          {attachedFiles.length > 0 && (
            <div style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 6,
              padding: "10px 12px 6px 12px",
              borderBottom: "1px dashed var(--border)"
            }}>
              {attachedFiles.map((file, idx) => (
                <div key={idx} style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: "var(--primary-soft)",
                  color: "var(--primary)",
                  padding: "4px 8px",
                  borderRadius: 8,
                  fontSize: 11.5,
                  fontWeight: 500,
                  maxWidth: "100%"
                }}>
                  <Icon name="file" size={11} />
                  <span className="truncate" style={{ maxWidth: 180 }}>{file.name}</span>
                  <button
                    type="button"
                    onClick={() => setAttachedFiles(attachedFiles.filter((_, i) => i !== idx))}
                    style={{
                      border: 0,
                      background: "transparent",
                      color: "var(--primary)",
                      cursor: "pointer",
                      padding: 0,
                      display: "grid",
                      placeItems: "center"
                    }}
                  >
                    <Icon name="x" size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Actual input controls */}
          <div style={{
            padding: "10px 12px",
            display: "flex",
            gap: 8,
            alignItems: "flex-end"
          }}>
            {/* Attachment Button */}
            {(lesson?.documents || []).length > 0 && (
              <button
                type="button"
                onClick={() => setShowAttachmentDropdown(!showAttachmentDropdown)}
                disabled={loading}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  background: showAttachmentDropdown ? "var(--primary-soft)" : "var(--card)",
                  color: showAttachmentDropdown ? "var(--primary)" : "var(--subtle)",
                  cursor: "pointer",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0,
                  transition: "all 0.15s"
                }}
                onMouseOver={(e) => { if (!showAttachmentDropdown) { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.color = "var(--primary)"; } }}
                onMouseOut={(e) => { if (!showAttachmentDropdown) { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--subtle)"; } }}
                title="แนบเอกสารบทเรียน"
              >
                <Icon name="clip" size={16} />
              </button>
            )}

            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="ถามคำถามเกี่ยวกับบทเรียน..."
              rows={1}
              disabled={loading}
              style={{
                flex: 1, resize: "none", border: "1px solid var(--border)",
                borderRadius: 12, padding: "8px 12px", fontSize: 13.5,
                background: "var(--bg)", color: "var(--fg)", outline: "none",
                fontFamily: "inherit", lineHeight: 1.5,
                maxHeight: 80, overflowY: "auto",
              }}
              onInput={(e) => {
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 80) + "px";
              }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={(!input.trim() && attachedFiles.length === 0) || loading}
              style={{
                width: 36, height: 36, borderRadius: 10, border: 0,
                background: (input.trim() || attachedFiles.length > 0) && !loading ? "var(--primary)" : "var(--muted)",
                color: (input.trim() || attachedFiles.length > 0) && !loading ? "#fff" : "var(--subtle)",
                cursor: (input.trim() || attachedFiles.length > 0) && !loading ? "pointer" : "not-allowed",
                display: "grid", placeItems: "center",
                transition: "all 0.15s",
                flexShrink: 0,
              }}
            >
              <Icon name="send" size={16} />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes aiChatSlideIn {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes aiTypingDot {
          0%, 80%, 100% { transform: scale(1); opacity: 0.5; }
          40% { transform: scale(1.3); opacity: 1; }
        }
      `}</style>
    </>
  );
}
