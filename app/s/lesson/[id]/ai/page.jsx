"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { supabase } from "@/lib/supabase";
import Icon from "@/components/ui/Icon";
import { Crumb } from "@/components/ui/Shared";
import Loading from "@/components/ui/Loading";
import AiAvatar from "@/components/ui/AiAvatar";

// ---- Simple markdown renderer (bold, bullets, code) ----
function MarkdownText({ text }) {
  if (!text) return null;

  const lines = text.split("\n");
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("## ")) {
      elements.push(
        <div key={i} style={{ fontWeight: 700, fontSize: 15, marginTop: 12, marginBottom: 6, color: "var(--primary)" }}>
          {renderInline(line.slice(3))}
        </div>
      );
    } else if (line.startsWith("# ")) {
      elements.push(
        <div key={i} style={{ fontWeight: 700, fontSize: 16, marginTop: 14, marginBottom: 8 }}>
          {renderInline(line.slice(2))}
        </div>
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <div key={i} style={{ display: "flex", gap: 8, marginTop: 4, paddingLeft: 4 }}>
          <span style={{ color: "var(--primary)", marginTop: 2, flexShrink: 0 }}>•</span>
          <span>{renderInline(line.slice(2))}</span>
        </div>
      );
    } else if (line.startsWith("```")) {
      let codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <pre key={i} style={{
          background: "var(--muted)", borderRadius: 10, padding: "12px 16px",
          fontSize: 13, overflowX: "auto", margin: "8px 0", fontFamily: "monospace",
          border: "1px solid var(--border)"
        }}>
          {codeLines.join("\n")}
        </pre>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={i} style={{ height: 8 }} />);
    } else {
      elements.push(
        <div key={i} style={{ marginTop: 4, lineHeight: 1.6 }}>
          {renderInline(line)}
        </div>
      );
    }
    i++;
  }

  return <div style={{ fontSize: 14.5 }}>{elements}</div>;
}

function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} style={{
          background: "var(--muted)", borderRadius: 6, padding: "2px 6px",
          fontFamily: "monospace", fontSize: 13
        }}>
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

function TypingDots() {
  return (
    <div style={{ display: "flex", gap: 5, alignItems: "center", padding: "8px 4px" }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{
          width: 7, height: 7, borderRadius: "50%",
          background: "var(--primary)", opacity: 0.7,
          animation: `aiTypingDot 1.2s ${i * 0.2}s infinite ease-in-out`
        }} />
      ))}
    </div>
  );
}

const parseEmotionAndReply = (text) => {
  if (!text) return { emotion: "smile", cleanText: "" };
  let emotion = "smile";
  let cleanText = text;

  const match = text.match(/\[emotion:\s*(impressive|mad|smile|idle)\]/i);
  if (match) {
    emotion = match[1].toLowerCase();
    cleanText = text.replace(/\[emotion:\s*(impressive|mad|smile|idle)\]/gi, "").trim();
  }

  return { emotion, cleanText };
};

const SUGGESTIONS = [
  "สรุปเนื้อหาบทเรียนนี้ให้หน่อย",
  "อธิบายจุดสำคัญของบทเรียนนี้",
  "มีแนวคิดอะไรที่ยากในบทเรียนนี้บ้าง?",
  "ช่วยยกตัวอย่างให้เข้าใจง่ายขึ้นหน่อย",
];

export default function StudentAiChatPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const nav = (path) => router.push(path);

  const lessonId = params?.id;
  const studentId = session?.dbId;

  const [lesson, setLesson] = useState(null);
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [apiLoading, setApiLoading] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [showAttachmentDropdown, setShowAttachmentDropdown] = useState(false);
  const [currentEmotion, setCurrentEmotion] = useState("idle");
  const [aiStatus, setAiStatus] = useState("checking"); // "checking", "online", "offline", "degraded"
  const [aiStatusReason, setAiStatusReason] = useState("");

  const checkAiHealth = async () => {
    setAiStatus("checking");
    try {
      const res = await fetch("/api/ai/health");
      if (res.ok) {
        const data = await res.json();
        setAiStatus(data.status);
        setAiStatusReason(data.reason || "");
      } else {
        setAiStatus("offline");
        setAiStatusReason("HTTP request failed");
      }
    } catch (e) {
      setAiStatus("offline");
      setAiStatusReason(e.message);
    }
  };

  useEffect(() => {
    checkAiHealth();
  }, []);
 
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const attachmentRef = useRef(null);
 
  useEffect(() => {
    let active = true;
    async function loadLesson() {
      if (!lessonId) return;
      const { data: lData } = await supabase.from("lessons").select("*").eq("id", lessonId).single();
      if (!lData) {
        if (active) setLoading(false);
        return;
      }
      const { data: cData } = await supabase.from("courses").select("*").eq("id", lData.course_id).single();
      
      if (!active) return;
      setLesson(lData);
      setCourse(cData || { id: "c1", code: "Unknown", title: "Unknown" });
      setLoading(false);
 
      // Add initial greeting message
      const defaultGreeting = `สวัสดีครับ! ยินดีต้อนรับสู่ห้องสนทนา AI สำหรับบทเรียน **"${lData.title || "บทเรียนนี้"}"** 🎓\n\nผมพร้อมตอบคำถามเกี่ยวกับเนื้อหา อธิบายหัวข้อที่ยาก หรือสรุปบทเรียนให้คุณแล้ว ถามคำถามมาด้านล่างได้เลยครับ!`;
      setMessages([
        {
          role: "assistant",
          content: defaultGreeting,
        },
      ]);
      setCurrentEmotion("idle");

      fetch("/api/ai/persona")
        .then((res) => res.json())
        .then((data) => {
          if (!active) return;
          if (data.greetingTemplate) {
            const customMsg = data.greetingTemplate.replace(/{lesson_title}/g, lData.title || "บทเรียนนี้");
            const { emotion, cleanText } = parseEmotionAndReply(customMsg);
            setCurrentEmotion(emotion === "smile" ? "idle" : emotion);
            setMessages([
              {
                role: "assistant",
                content: cleanText,
              },
            ]);
          }
        })
        .catch((err) => {
          console.error("Failed to load custom greeting:", err);
        });
    }
    loadLesson();
    return () => {
      active = false;
    };
  }, [lessonId]);
 
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
  }, [messages, apiLoading]);
 
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
    setApiLoading(true);
 
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          lessonContext,
          mode,
          studentId: studentId || session?.user?.id,
          attachments: currentAttachments
        }),
      });
 
      const data = await res.json();
      const reply = data.reply || "ขออภัย ไม่สามารถตอบได้ในขณะนี้";
      const { emotion, cleanText } = parseEmotionAndReply(reply);
      setCurrentEmotion(emotion);
 
      if (mode === "summarize") {
        setMessages([
          ...messages,
          { role: "user", content: "📋 ขอสรุปเนื้อหาบทเรียนนี้" },
          { role: "assistant", content: cleanText },
        ]);
        setSummarizing(false);
      } else {
        setMessages([...newMessages, { role: "assistant", content: cleanText }]);
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
    setApiLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  if (loading) return <Loading className="container p-5 text-center muted" />;

  if (!lesson) {
    return (
      <div className="container p-5">
        <div className="card">
          <div className="empty">
            <div className="ec"><Icon name="alert" size={22} style={{ color: "var(--warning)" }} /></div>
            <div className="fw-6 fg" style={{ fontSize: "16px" }}>ไม่พบบทเรียน</div>
          </div>
        </div>
      </div>
    );
  }

  if (lesson.allow_ai === false) {
    return (
      <div className="container">
        <Crumb nav={nav} items={[
          { label: "รายวิชาของฉัน", to: "/s/courses" },
          { label: course.code, to: "/s/course/" + course.id },
          { label: `บทที่ ${lesson.index}`, to: `/s/lesson/${lesson.id}` },
          { label: "AI ผู้ช่วยสอน" }
        ]} />
        <div className="card text-center" style={{ maxWidth: 600, margin: "40px auto", padding: "40px 24px", borderRadius: 16 }}>
          <div style={{ width: 80, height: 80, borderRadius: 20, background: "var(--warning-soft)", color: "var(--warning)", display: "grid", placeItems: "center", margin: "0 auto 24px" }}>
            <Icon name="lock" size={32} />
          </div>
          <div className="t-xl fw-7 fg">ขออภัย บทเรียนนี้ไม่อนุญาตให้ใช้ AI</div>
          <p style={{ color: "var(--muted-fg)", marginTop: 12, fontSize: 15, lineHeight: 1.6, maxWidth: 460, margin: "12px auto 24px" }} className="pretty">
            บทเรียนนี้ยังไม่ได้เปิดใช้งาน AI ผู้ช่วยเรียนรู้ในการสรุปเนื้อหาและการติวข้อสอบ
          </p>
          <button className="btn btn-primary" onClick={() => nav(`/s/lesson/${lesson.id}`)}>
            <Icon name="arrL" size={16} /> กลับสู่หน้าบทเรียน
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-wide" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 100px)" }}>
      <Crumb nav={nav} items={[
        { label: "รายวิชาของฉัน", to: "/s/courses" },
        { label: course.code, to: "/s/course/" + course.id },
        { label: `บทที่ ${lesson.index}`, to: `/s/lesson/${lesson.id}` },
        { label: "AI ผู้ช่วยสอน" }
      ]} />

      <div style={{
        display: "flex",
        flex: 1,
        gap: 20,
        minHeight: 0,
        marginTop: 10,
        flexDirection: "row",
      }} className="ai-layout-container">
        
        {/* Left Side: AI Profile Card & Lesson Details */}
        <div style={{
          width: 320,
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 20,
          padding: "24px 20px",
          display: "flex",
          flexDirection: "column",
          color: "var(--fg)",
          boxShadow: "0 8px 30px rgba(13,110,140,0.06)",
          flexShrink: 0,
          position: "relative",
          overflow: "hidden",
          gap: 16
        }} className="hide-m">
          {/* Subtle Gradient Accent Bar at Top */}
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: "linear-gradient(90deg, var(--primary) 0%, #0891b2 100%)"
          }} />

          {/* Card Header */}
          <div style={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid var(--border)",
            paddingBottom: 12,
            marginBottom: 4,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="sparkle" size={14} style={{ color: "var(--primary)" }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--primary)", letterSpacing: 0.5 }}>ติวเตอร์</span>
            </div>
            {/* Status indicator */}
            <div
              onClick={checkAiHealth}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                background:
                  aiStatus === "online" ? "var(--success-soft, rgba(16,185,129,0.1))" :
                    aiStatus === "degraded" ? "var(--warning-soft, rgba(245,158,11,0.1))" :
                      aiStatus === "checking" ? "var(--muted)" :
                        "var(--danger-soft, rgba(239,68,68,0.1))",
                padding: "4px 8px",
                borderRadius: 12,
                cursor: "pointer",
                userSelect: "none"
              }}
              title={aiStatusReason ? `คลิกเพื่อตรวจสอบสถานะใหม่ (เหตุผล: ${aiStatusReason})` : "คลิกเพื่อตรวจสอบสถานะใหม่"}
            >
              {aiStatus === "checking" ? (
                <>
                  <Icon name="loader" size={10} className="spin" style={{ color: "var(--muted-fg)" }} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted-fg)" }}>ตรวจสอบ...</span>
                </>
              ) : (
                <>
                  <span
                    className={aiStatus === "online" ? "pulse-dot" : ""}
                    style={{
                      display: "inline-block",
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background:
                        aiStatus === "online" ? "#10b981" :
                          aiStatus === "degraded" ? "#f59e0b" :
                            "#ef4444"
                    }}
                  />
                  <span style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color:
                      aiStatus === "online" ? "#0f766e" :
                        aiStatus === "degraded" ? "#b45309" :
                          "#b91c1c"
                  }}>
                    {aiStatus === "online" ? "ออนไลน์" : aiStatus === "degraded" ? "บริการขัดข้อง" : "ออฟไลน์"}
                  </span>
                </>
              )}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
            {/* Large Animated Avatar Portrait */}
            <div style={{
              position: "relative",
              marginBottom: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              {/* Inner Ring Glow */}
              <div style={{
                position: "absolute",
                inset: -6,
                borderRadius: "20px",
                background: "linear-gradient(135deg, var(--primary-soft) 0%, rgba(255,255,255,0) 100%)",
                zIndex: 0,
                opacity: 0.8
              }} />
              <AiAvatar size={120} emotion={apiLoading ? "thinking" : currentEmotion} style={{ borderRadius: "16px", zIndex: 1, border: "2px solid var(--primary)", boxShadow: "0 6px 15px rgba(13,110,140,0.12)" }} />
            </div>

            {/* Name & Role */}
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--fg)", marginBottom: 4 }}>ยูริจัง</div>
            <div style={{ fontSize: 11, color: "var(--primary)", fontWeight: 600, marginBottom: 12, background: "var(--primary-soft)", padding: "2px 8px", borderRadius: 20 }}>
              ผู้ช่วยสอนประจำรายวิชา
            </div>
          </div>

          {/* Info Details List & Lesson details */}
          <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Info Table */}
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8, borderBottom: "1px solid var(--border)", paddingBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }}>
                <span style={{ color: "var(--subtle)", fontWeight: 500 }}>โมเดลประมวลผล</span>
                <span style={{ color: "var(--fg)", fontWeight: 600 }}>Gemini 2.5 Flash</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }}>
                <span style={{ color: "var(--subtle)", fontWeight: 500 }}>ระบบตอบคำถาม</span>
                <span style={{ color: "var(--fg)", fontWeight: 600 }}>RAG + คลังบทเรียน</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }}>
                <span style={{ color: "var(--subtle)", fontWeight: 500 }}>การรองรับไฟล์</span>
                <span style={{ color: "var(--fg)", fontWeight: 600 }}>PDF, รูปภาพ, ข้อความ</span>
              </div>
            </div>

            {lesson && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Icon name="book" size={14} style={{ color: "var(--primary)" }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--fg)" }}>บทเรียนปัจจุบัน</span>
                </div>
                <div style={{ paddingLeft: 22 }}>
                  <div className="t-xs fw-6 c-primary uppercase">บทที่ {lesson.index}</div>
                  <div className="fw-7 t-sm fg truncate" style={{ maxWidth: 220 }}>{lesson.title}</div>
                  <p className="t-xs muted pretty mt-1" style={{ whiteSpace: "pre-line", margin: 0, lineHeight: 1.4 }}>
                    {lesson.description || "ไม่มีคำอธิบายบทเรียน"}
                  </p>
                </div>
              </div>
            )}
          </div>

          {lesson && lesson.allow_ai !== false && (
            <>
              <div style={{ borderBottom: "1px solid var(--border)", margin: "4px 0" }} />
              <button
                onClick={() => sendMessage("", "summarize")}
                disabled={apiLoading || summarizing}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "10px 16px", borderRadius: 12, border: 0,
                  background: "linear-gradient(135deg, var(--primary) 0%, #0891b2 100%)",
                  color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(13,110,140,0.25)",
                  opacity: (apiLoading || summarizing) ? 0.6 : 1,
                  flexShrink: 0
                }}
              >
                <Icon name="sparkle" size={14} />
                {summarizing ? "กำลังสรุปเนื้อหา..." : "สรุปบทเรียนด้วย AI"}
              </button>
            </>
          )}
        </div>

        {/* Right Side: Main Chat Interface */}
        <div style={{
          flex: 1,
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          minWidth: 0,
        }}>
          {/* Chat Header for mobile layout info */}
          <div style={{
            padding: "14px 20px",
            borderBottom: "1px solid var(--border)",
            background: "var(--muted)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: "linear-gradient(135deg, var(--primary), #0891b2)",
                display: "grid", placeItems: "center", color: "#fff",
              }}>
                <Icon name="sparkle" size={15} />
              </div>
              <div>
                <span className="fw-7 t-sm fg">ห้องแชท AI ติวเตอร์</span>
                <span className="t-xs muted ml-2 hide-d">· บทที่ {lesson.index}</span>
              </div>
            </div>
            
            <button
              onClick={() => sendMessage("", "summarize")}
              disabled={apiLoading || summarizing}
              className="hide-d btn btn-soft btn-sm"
              style={{ padding: "6px 12px", fontSize: 12 }}
            >
              <Icon name="sparkle" size={13} />
              สรุปบทเรียน
            </button>
          </div>

          {/* Quick Actions (Suggestions) */}
          {messages.length <= 1 && (
            <div style={{
              padding: "12px 20px 6px 20px",
              display: "flex",
              gap: 8,
              overflowX: "auto",
              flexWrap: "wrap",
            }}>
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s)}
                  disabled={apiLoading}
                  style={{
                    padding: "7px 14px", borderRadius: 20, border: "1px solid var(--border)",
                    background: "var(--bg)", color: "var(--fg)", fontSize: 12.5,
                    cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.15s",
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.borderColor = "var(--primary)"; e.currentTarget.style.background = "var(--primary-soft)"; }}
                  onMouseOut={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg)"; }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Messages Area */}
          <div style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}>
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                  gap: 12,
                  alignItems: "flex-start",
                }}
              >
                {msg.role === "assistant" && (
                  <AiAvatar size={32} />
                )}
                
                <div style={{
                  maxWidth: "75%",
                  padding: "12px 18px",
                  borderRadius: msg.role === "user" ? "20px 20px 4px 20px" : "20px 20px 20px 4px",
                  background: msg.role === "user"
                    ? "linear-gradient(135deg, var(--primary), #0891b2)"
                    : "var(--muted)",
                  color: msg.role === "user" ? "#fff" : "var(--fg)",
                  boxShadow: msg.role === "user" ? "0 4px 12px rgba(13,110,140,0.15)" : "none",
                  border: msg.role === "assistant" ? "1px solid var(--border)" : "none",
                }}>
                  {msg.role === "assistant" ? (
                    <MarkdownText text={msg.content} />
                  ) : (
                    <div>
                      <div style={{ fontSize: 14.5, lineHeight: 1.6 }}>{msg.content}</div>
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
                                fontSize: 12,
                                color: "#fff",
                                opacity: 0.95,
                                textDecoration: "underline"
                              }}
                            >
                              <Icon name="file" size={12} />
                              <span className="truncate" style={{ maxWidth: 220 }}>{f.name}</span>
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {apiLoading && !summarizing && (
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <AiAvatar size={32} />
                <div style={{
                  padding: "12px 18px",
                  borderRadius: "20px 20px 20px 4px",
                  background: "var(--muted)",
                  border: "1px solid var(--border)",
                }}>
                  <TypingDots />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Chat Input Area */}
          <div style={{
            padding: "16px 24px 20px",
            borderTop: "1px solid var(--border)",
            background: "var(--card)",
            position: "relative"
          }}>
            {/* Document attachment selector dropdown */}
            {showAttachmentDropdown && (
              <div ref={attachmentRef} className="card shadow-lg" style={{
                position: "absolute",
                bottom: "100%",
                left: 24,
                zIndex: 1000,
                width: 320,
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
                padding: "0 12px 10px 12px",
                borderBottom: "1px dashed var(--border)",
                marginBottom: 10
              }}>
                {attachedFiles.map((file, idx) => (
                  <div key={idx} style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    background: "var(--primary-soft)",
                    color: "var(--primary)",
                    padding: "4px 10px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 500,
                    maxWidth: "100%"
                  }}>
                    <Icon name="file" size={12} />
                    <span className="truncate" style={{ maxWidth: 220 }}>{file.name}</span>
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
                      <Icon name="x" size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{
              display: "flex",
              gap: 12,
              alignItems: "flex-end",
              background: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: "8px 12px",
            }}>
              {/* Attachment Button */}
              {(lesson?.documents || []).length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAttachmentDropdown(!showAttachmentDropdown)}
                  disabled={apiLoading}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: showAttachmentDropdown ? "var(--primary-soft)" : "var(--card)",
                    color: showAttachmentDropdown ? "var(--primary)" : "var(--subtle)",
                    cursor: "pointer",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                    transition: "all 0.15s",
                    marginBottom: 2
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
                placeholder="พิมพ์ถามคำถามเกี่ยวกับเนื้อหาบทเรียนได้ที่นี่..."
                rows={1}
                disabled={apiLoading}
                style={{
                  flex: 1, resize: "none", border: 0,
                  borderRadius: 8, padding: "8px 4px", fontSize: 14.5,
                  background: "transparent", color: "var(--fg)", outline: "none",
                  fontFamily: "inherit", lineHeight: 1.5,
                  maxHeight: 120, overflowY: "auto",
                }}
                onInput={(e) => {
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                }}
              />
              
              <button
                onClick={() => sendMessage(input)}
                disabled={(!input.trim() && attachedFiles.length === 0) || apiLoading}
                style={{
                  width: 40, height: 40, borderRadius: 12, border: 0,
                  background: (input.trim() || attachedFiles.length > 0) && !apiLoading ? "var(--primary)" : "var(--muted)",
                  color: (input.trim() || attachedFiles.length > 0) && !apiLoading ? "#fff" : "var(--subtle)",
                  cursor: (input.trim() || attachedFiles.length > 0) && !apiLoading ? "pointer" : "not-allowed",
                  display: "grid", placeItems: "center",
                  transition: "all 0.15s",
                  flexShrink: 0,
                }}
              >
                <Icon name="send" size={18} />
              </button>
            </div>
          </div>
        </div>

      </div>

      <style>{`
        @keyframes aiTypingDot {
          0%, 80%, 100% { transform: scale(1); opacity: 0.5; }
          40% { transform: scale(1.3); opacity: 1; }
        }
        @keyframes pulseGlow {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
          70% { transform: scale(1); box-shadow: 0 0 0 5px rgba(16, 185, 129, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        .pulse-dot {
          animation: pulseGlow 2s infinite;
        }
        @media (max-width: 900px) {
          .hide-m { display: none !important; }
          .hide-d { display: flex !important; }
        }
        @media (min-width: 901px) {
          .hide-d { display: none !important; }
        }
      `}</style>
    </div>
  );
}
