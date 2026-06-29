"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Icon from "@/components/ui/Icon";
import { PageHead, Crumb } from "@/components/ui/Shared";
import Loading from "@/components/ui/Loading";
import { toast } from "@/components/ui/Toast";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";
import AiAvatar from "@/components/ui/AiAvatar";

function MarkdownRenderer({ text }) {
  if (!text) return null;
  const lines = text.split("\n");
  const elements = [];
  let i = 0;

  const renderInline = (inlineText) => {
    const parts = inlineText.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);
    return parts.map((part, idx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={idx} style={{ color: "var(--fg)" }}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("*") && part.endsWith("*")) {
        return <em key={idx}>{part.slice(1, -1)}</em>;
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code key={idx} style={{
            background: "rgba(13,110,140,0.1)", borderRadius: 5, padding: "2px 6px",
            fontFamily: "monospace", fontSize: "0.9em", color: "var(--primary)"
          }}>
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("# ")) {
      elements.push(
        <h1 key={i} style={{ fontSize: "24px", fontWeight: 800, marginTop: "20px", marginBottom: "12px", color: "var(--primary)", borderBottom: "1px solid var(--border)", paddingBottom: "8px" }}>
          {renderInline(line.slice(2))}
        </h1>
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} style={{ fontSize: "19px", fontWeight: 700, marginTop: "18px", marginBottom: "10px", color: "var(--primary)" }}>
          {renderInline(line.slice(3))}
        </h2>
      );
    } else if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} style={{ fontSize: "16px", fontWeight: 700, marginTop: "14px", marginBottom: "8px", color: "var(--fg)" }}>
          {renderInline(line.slice(4))}
        </h3>
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <div key={i} style={{ display: "flex", gap: 10, marginTop: 6, paddingLeft: 8, lineHeight: 1.6 }}>
          <span style={{ color: "var(--primary)", fontWeight: 700, flexShrink: 0 }}>✦</span>
          <span style={{ color: "var(--muted-fg)" }}>{renderInline(line.slice(2))}</span>
        </div>
      );
    } else if (/^\d+\.\s/.test(line)) {
      const match = line.match(/^(\d+)\.\s(.*)/);
      if (match) {
        elements.push(
          <div key={i} style={{ display: "flex", gap: 10, marginTop: 6, paddingLeft: 8, lineHeight: 1.6 }}>
            <span style={{ color: "var(--primary)", fontWeight: 700, flexShrink: 0 }}>{match[1]}.</span>
            <span style={{ color: "var(--muted-fg)" }}>{renderInline(match[2])}</span>
          </div>
        );
      } else {
        elements.push(
          <p key={i} style={{ marginTop: 6, marginBottom: 6, lineHeight: 1.6, color: "var(--muted-fg)" }}>
            {renderInline(line)}
          </p>
        );
      }
    } else if (line.startsWith("```")) {
      let codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <pre key={i} style={{
          background: "#0f172a", color: "#e2e8f0", borderRadius: 12, padding: "14px 18px",
          fontSize: 13, overflowX: "auto", margin: "14px 0", fontFamily: "monospace",
          border: "1px solid var(--border-strong)", boxShadow: "inset 0 2px 8px rgba(0,0,0,0.4)"
        }}>
          {codeLines.join("\n")}
        </pre>
      );
    } else if (line.startsWith("> ")) {
      elements.push(
        <blockquote key={i} style={{
          borderLeft: "4px solid var(--primary)", paddingLeft: 16, margin: "14px 0",
          color: "var(--muted-fg)", fontStyle: "italic", lineHeight: 1.6
        }}>
          {renderInline(line.slice(2))}
        </blockquote>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={i} style={{ height: 12 }} />);
    } else {
      elements.push(
        <p key={i} style={{ marginTop: 6, marginBottom: 6, lineHeight: 1.6, color: "var(--muted-fg)" }}>
          {renderInline(line)}
        </p>
      );
    }
    i++;
  }

  return <div style={{ fontSize: "14.5px" }}>{elements}</div>;
}

export default function AiPersonaPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [content, setContent] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("rendered"); // "rendered" or "source"
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aiStatus, setAiStatus] = useState("checking"); // "checking", "online", "offline", "degraded"
  const [aiStatusReason, setAiStatusReason] = useState("");

  // Token config states
  const [configDraft, setConfigDraft] = useState({
    daily_chat_limit: "15",
    session_token_limit: "20000",
    max_output_tokens: "2048",
    max_output_tokens_with_files: "4096",
  });
  const [configSaving, setConfigSaving] = useState(false);

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

  const fetchPersona = async () => {
    try {
      const [personaRes, configRes] = await Promise.all([
        fetch("/api/ai/persona"),
        fetch("/api/ai/config"),
      ]);
      if (personaRes.ok) {
        const data = await personaRes.json();
        setContent(data.content);
        setDraftContent(data.content);
      } else {
        toast("เกิดข้อผิดพลาดในการโหลดข้อมูล Persona");
      }
      if (configRes.ok) {
        const cfg = await configRes.json();
        setConfigDraft({
          daily_chat_limit: String(cfg.daily_chat_limit ?? "15"),
          session_token_limit: String(cfg.session_token_limit ?? "20000"),
          max_output_tokens: String(cfg.max_output_tokens ?? "2048"),
          max_output_tokens_with_files: String(cfg.max_output_tokens_with_files ?? "4096"),
        });
      }
    } catch (e) {
      console.error(e);
      toast("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    setConfigSaving(true);
    try {
      const res = await fetch("/api/ai/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configDraft),
      });
      if (res.ok) {
        toast("บันทึกการตั้งค่า Token สำเร็จ", "success");
      } else {
        toast("บันทึกการตั้งค่าล้มเหลว");
      }
    } catch (e) {
      console.error(e);
      toast("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setConfigSaving(false);
    }
  };

  const setConfig = (key, val) => {
    // allow only positive integers
    const num = val.replace(/[^0-9]/g, "");
    setConfigDraft(prev => ({ ...prev, [key]: num }));
  };

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated" || !hasPermission(session?.user, PERMISSIONS.MASTER_MANAGE)) {
      router.replace("/i/courses");
      return;
    }
    fetchPersona();
    checkAiHealth();
  }, [status]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/ai/persona", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draftContent }),
      });
      if (res.ok) {
        setContent(draftContent);
        setIsEditing(false);
        toast("บันทึกข้อกำหนดบทบาท AI สำเร็จแล้ว", "success");
      } else {
        toast("บันทึกข้อมูลล้มเหลว");
      }
    } catch (e) {
      console.error(e);
      toast("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setSaving(false);
    }
  };

  if (loading || status === "loading") {
    return <Loading className="container p-5 text-center muted" />;
  }

  const nav = (path) => router.push(path);

  return (
    <div className="container-wide">
      <Crumb nav={nav} items={[{ label: "หน้าหลักผู้สอน", to: "/i/courses" }, { label: "กำหนด Persona AI", to: "/i/master/ai-persona" }]} />
      <PageHead
        kicker="ตั้งค่าระบบการเรียนรู้"
        title="กำหนดพฤติกรรม & Persona ของ AI"
      />

      <div style={{ display: "flex", gap: 24, flexDirection: "row", alignItems: "flex-start", marginTop: 8 }} className="persona-split-layout">

        {/* Left Column: AI Profile Card (Modern E-Learning Style) */}
        <div style={{
          width: 300,
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 20,
          padding: "24px 20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          color: "var(--fg)",
          boxShadow: "0 8px 30px rgba(13,110,140,0.06)",
          flexShrink: 0,
          position: "relative",
          overflow: "hidden"
        }} className="ai-profile-preview-card">

          {/* Subtle Gradient Accent Bar at Top */}
          <div style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: "linear-gradient(90deg, var(--primary) 0%, #0891b2 100%)"
          }} />

          {/* Card Header (Modern style) */}
          <div style={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid var(--border)",
            paddingBottom: 12,
            marginBottom: 20,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Icon name="sparkle" size={14} style={{ color: "var(--primary)" }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--primary)", letterSpacing: 0.5 }}>โปรไฟล์ผู้ช่วย AI</span>
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

          {/* Large Animated Avatar Portrait */}
          <div style={{
            position: "relative",
            marginBottom: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            {/* Inner Ring Glow */}
            <div style={{
              position: "absolute",
              inset: -6,
              borderRadius: "50%",
              background: "linear-gradient(135deg, var(--primary-soft) 0%, rgba(255,255,255,0) 100%)",
              zIndex: 0,
              opacity: 0.8
            }} />
            <AiAvatar size={110} style={{ zIndex: 1, border: "2.5px solid var(--primary)", boxShadow: "0 8px 20px rgba(13,110,140,0.15)" }} />
          </div>

          {/* Name & Role */}
          <div style={{ fontSize: 18, fontWeight: 700, color: "var(--fg)", marginBottom: 4 }}>ยูริจัง</div>
          <div style={{ fontSize: 12, color: "var(--primary)", fontWeight: 600, marginBottom: 16, background: "var(--primary-soft)", padding: "3px 10px", borderRadius: 20 }}>
            ผู้ช่วยสอนประจำรายวิชา
          </div>

          {/* Tagline/Bio inside quotation balloon */}
          <div style={{
            fontSize: 13,
            color: "var(--muted-fg)",
            textAlign: "center",
            lineHeight: 1.5,
            padding: "12px 14px",
            background: "var(--muted)",
            borderRadius: 14,
            width: "100%",
            borderLeft: "3px solid var(--primary)",
            fontStyle: "italic",
            marginBottom: 20
          }}>
            “ขี้เล่น มีอารมณ์ขัน แต่งานเป๊ะ พร้อมสนับสนุนการเรียนรู้ของนักศึกษาตลอด 24 ชั่วโมง”
          </div>

          {/* Info Details List */}
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10, borderTop: "1px solid var(--border)", paddingTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
              <span style={{ color: "var(--subtle)", fontWeight: 500 }}>โมเดลประมวลผล</span>
              <span style={{ color: "var(--fg)", fontWeight: 600 }}>Gemini 2.5 Flash</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
              <span style={{ color: "var(--subtle)", fontWeight: 500 }}>ระบบตอบคำถาม</span>
              <span style={{ color: "var(--fg)", fontWeight: 600 }}>RAG + คลังบทเรียน</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
              <span style={{ color: "var(--subtle)", fontWeight: 500 }}>การรองรับไฟล์</span>
              <span style={{ color: "var(--fg)", fontWeight: 600 }}>PDF, รูปภาพ, ข้อความ</span>
            </div>
          </div>
        </div>

        {/* Right Column: Controls Bar & Content Box */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Controls Bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "between", gap: 12, flexWrap: "wrap", width: "100%" }}>
            {/* Tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab("rendered")}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "1px solid " + (activeTab === "rendered" ? "var(--primary)" : "var(--border)"),
                  background: activeTab === "rendered" ? "var(--primary-soft)" : "transparent",
                  color: activeTab === "rendered" ? "var(--primary)" : "var(--muted-fg)",
                  fontWeight: activeTab === "rendered" ? 600 : 400,
                  fontSize: 13,
                  cursor: "pointer",
                  transition: ".15s"
                }}
              >
                RENDERED
              </button>
              <button
                onClick={() => setActiveTab("source")}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "1px solid " + (activeTab === "source" ? "var(--primary)" : "var(--border)"),
                  background: activeTab === "source" ? "var(--primary-soft)" : "transparent",
                  color: activeTab === "source" ? "var(--primary)" : "var(--muted-fg)",
                  fontWeight: activeTab === "source" ? 600 : 400,
                  fontSize: 13,
                  cursor: "pointer",
                  transition: ".15s"
                }}
              >
                SOURCE
              </button>
            </div>

            {/* Action Button */}
            <div style={{ marginLeft: "auto" }}>
              {!isEditing ? (
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setDraftContent(content);
                    setIsEditing(true);
                  }}
                  style={{
                    background: "linear-gradient(135deg, var(--primary) 0%, #0891b2 100%)",
                    boxShadow: "0 4px 14px rgba(13,110,140,0.25)"
                  }}
                >
                  <Icon name="pencil" size={15} />
                  แก้ไขบทบาท AI
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    className="btn btn-outline"
                    onClick={() => setIsEditing(false)}
                    disabled={saving}
                  >
                    ยกเลิก
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <Icon name="loader" size={15} className="spin" />
                        กำลังบันทึก...
                      </>
                    ) : (
                      <>
                        <Icon name="check" size={15} />
                        บันทึกบทบาท AI
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Content Box */}
          <div
            className="card"
            style={{
              position: "relative",
              minHeight: 400,
              background: "var(--card)",
              borderRadius: 16,
              overflow: "hidden",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.04)",
              border: "1px solid var(--border)",
            }}
          >
            {/* Gold Gradient Top Border Bar (Premium Look) */}
            <div
              style={{
                height: 4,
                width: "100%",
                background: "linear-gradient(90deg, #f59e0b 0%, var(--primary) 50%, #3b82f6 100%)",
              }}
            />

            <div style={{ padding: "24px 28px" }}>
              {isEditing ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ fontSize: 13, color: "var(--muted-fg)", fontWeight: 500 }} className="pretty">
                    ✏️ แก้ไขข้อกำหนดพฤติกรรม AI ในรูปแบบ Markdown:
                  </div>
                  <textarea
                    className="input"
                    value={draftContent}
                    onChange={(e) => setDraftContent(e.target.value)}
                    rows={18}
                    style={{
                      width: "100%",
                      fontFamily: "monospace",
                      fontSize: 14,
                      lineHeight: 1.6,
                      padding: "16px 20px",
                      borderRadius: 12,
                      background: "var(--bg)",
                      border: "1px solid var(--border-strong)",
                      resize: "vertical",
                    }}
                    placeholder="เขียนแนวทางพฤติกรรมของ AI..."
                  />
                </div>
              ) : activeTab === "rendered" ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <MarkdownRenderer text={content} />
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <pre
                    style={{
                      background: "#0f172a",
                      color: "#e2e8f0",
                      borderRadius: 12,
                      padding: "20px 24px",
                      fontSize: 13.5,
                      lineHeight: 1.65,
                      overflowX: "auto",
                      fontFamily: "monospace",
                      border: "1px solid var(--border-strong)",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-all"
                    }}
                  >
                    {content}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Token & Rate Limit Config Card */}
      <div className="card" style={{ marginTop: 24, borderRadius: 16, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.04)", border: "1px solid var(--border)" }}>
        <div style={{ height: 4, background: "linear-gradient(90deg, #3b82f6 0%, var(--primary) 100%)" }} />
        <div style={{ padding: "20px 24px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--fg)", display: "flex", alignItems: "center", gap: 8 }}>
                <Icon name="settings" size={16} style={{ color: "var(--primary)" }} />
                การตั้งค่า Token & Rate Limit
              </div>
              <div style={{ fontSize: 12.5, color: "var(--muted-fg)", marginTop: 4 }}>กำหนดขีดจำกัดการใช้งาน AI ต่อนักศึกษา 1 คน</div>
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleSaveConfig}
              disabled={configSaving}
              style={{ background: "linear-gradient(135deg, var(--primary) 0%, #0891b2 100%)", boxShadow: "0 4px 14px rgba(13,110,140,0.2)" }}
            >
              {configSaving ? <><Icon name="loader" size={14} className="spin" /> บันทึก...</> : <><Icon name="check" size={14} /> บันทึกการตั้งค่า</>}
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
            {[
              {
                key: "daily_chat_limit",
                label: "โควต้าต่อวัน (ครั้ง)",
                desc: "จำนวนครั้งที่นักศึกษาถาม+สรุปได้ต่อวัน",
                unit: "ครั้ง/วัน",
                icon: "calendar"
              },
              {
                key: "session_token_limit",
                label: "Session Token Limit",
                desc: "ขีดจำกัด token รวมของข้อความในแต่ละ session",
                unit: "tokens",
                icon: "chat"
              },
              {
                key: "max_output_tokens",
                label: "Max Output (ปกติ)",
                desc: "จำนวน token สูงสุดที่ AI ตอบต่อครั้ง (ไม่มีไฟล์)",
                unit: "tokens",
                icon: "sparkle"
              },
              {
                key: "max_output_tokens_with_files",
                label: "Max Output (มีไฟล์/สรุป)",
                desc: "จำนวน token สูงสุดเมื่อมีไฟล์แนบหรือโหมดสรุป",
                unit: "tokens",
                icon: "folder"
              },
            ].map(({ key, label, desc, unit, icon }) => (
              <div key={key} style={{
                background: "var(--muted)",
                borderRadius: 12,
                padding: "16px 18px",
                border: "1px solid var(--border)",
                display: "flex",
                flexDirection: "column",
                gap: 8
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--primary-soft)", color: "var(--primary)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <Icon name={icon} size={14} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--fg)" }}>{label}</div>
                    <div style={{ fontSize: 11, color: "var(--muted-fg)", lineHeight: 1.4 }}>{desc}</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    className="input"
                    style={{ flex: 1, fontWeight: 700, fontSize: 16, textAlign: "right", padding: "8px 12px" }}
                    value={configDraft[key]}
                    onChange={(e) => setConfig(key, e.target.value)}
                    inputMode="numeric"
                  />
                  <span style={{ fontSize: 12, color: "var(--muted-fg)", whiteSpace: "nowrap" }}>{unit}</span>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 16, padding: "10px 14px", background: "var(--primary-soft)", borderRadius: 10, fontSize: 12, color: "var(--primary)", display: "flex", alignItems: "flex-start", gap: 8 }}>
            <Icon name="info" size={13} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              ผู้สอน / Admin ไม่ถูกจำกัดโควต้า · โควต้าวันนี้รีเซ็ตเที่ยงคืนตามเวลาไทย · ค่า Token ประมาณการจากความยาวข้อความ (÷ 2.5)
            </span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulseGlow {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
          70% { transform: scale(1); box-shadow: 0 0 0 5px rgba(16, 185, 129, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        .pulse-dot {
          animation: pulseGlow 2s infinite;
        }
        @media (max-width: 900px) {
          .persona-split-layout {
            flex-direction: column !important;
          }
          .ai-profile-preview-card {
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
