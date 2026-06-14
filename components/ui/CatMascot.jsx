"use client";

import React, { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";


function CatFaceEyes({ eyeAngle, hovered = false, size = 64 }) {
  const ex = Math.cos(eyeAngle) * 2.5;
  const ey = Math.sin(eyeAngle) * 2.5;

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* ears */}
      <polygon points="18,44 8,14 34,28" fill="white" stroke="#2d2d2d" strokeWidth="3.5" strokeLinejoin="round" />
      <polygon points="82,44 92,14 66,28" fill="white" stroke="#2d2d2d" strokeWidth="3.5" strokeLinejoin="round" />
      <polygon points="20,40 13,20 30,30" fill="#f9b8cc" />
      <polygon points="80,40 87,20 70,30" fill="#f9b8cc" />

      {/* head */}
      <circle cx="50" cy="58" r="37" fill="white" stroke="#2d2d2d" strokeWidth="3.5" />
      <ellipse cx="38" cy="44" rx="10" ry="7" fill="#e8f4ff" opacity="0.5" />

      {/* eyes — open (tracking) or closed (^) on hover */}
      {hovered ? (
        <>
          <path d="M25 52 Q34 43 43 52" stroke="#2d2d2d" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M57 52 Q66 43 75 52" stroke="#2d2d2d" strokeWidth="3" strokeLinecap="round" fill="none" />
        </>
      ) : (
        <>
          <circle cx="34" cy="52" r="9" fill="white" stroke="#2d2d2d" strokeWidth="2.5" />
          <circle cx="66" cy="52" r="9" fill="white" stroke="#2d2d2d" strokeWidth="2.5" />
          <circle cx={34 + ex} cy={52 + ey} r="5.5" fill="#2d2d2d" />
          <circle cx={34 + ex - 1.5} cy={52 + ey - 1.5} r="1.8" fill="white" />
          <circle cx={66 + ex} cy={52 + ey} r="5.5" fill="#2d2d2d" />
          <circle cx={66 + ex - 1.5} cy={52 + ey - 1.5} r="1.8" fill="white" />
        </>
      )}

      {/* nose */}
      <path d="M46 65 Q50 61 54 65 Q50 70 46 65 Z" fill="#c0394e" stroke="#2d2d2d" strokeWidth="1" strokeLinejoin="round" />

      {/* mouth — closed smile or open on hover */}
      {hovered ? (
        <>
          <path d="M38 70 Q50 86 62 70" stroke="#2d2d2d" strokeWidth="2.5" strokeLinecap="round" fill="#f9b8cc" />
          <ellipse cx="50" cy="79" rx="8" ry="5.5" fill="#f48fb1" />
          <path d="M50 75 L50 84" stroke="#e8748a" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M42 70 L40 77 L45 73 Z" fill="white" stroke="#2d2d2d" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M58 70 L60 77 L55 73 Z" fill="white" stroke="#2d2d2d" strokeWidth="1.2" strokeLinejoin="round" />
        </>
      ) : (
        <path d="M42 70 Q50 77 58 70" stroke="#2d2d2d" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      )}

      {/* whiskers left */}
      <line x1="6" y1="60" x2="30" y2="64" stroke="#2d2d2d" strokeWidth="2" strokeLinecap="round" />
      <line x1="6" y1="67" x2="30" y2="67" stroke="#2d2d2d" strokeWidth="2" strokeLinecap="round" />
      {/* whiskers right */}
      <line x1="94" y1="60" x2="70" y2="64" stroke="#2d2d2d" strokeWidth="2" strokeLinecap="round" />
      <line x1="94" y1="67" x2="70" y2="67" stroke="#2d2d2d" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function CatMascot() {
  const [broadcasts, setBroadcasts] = useState([]);
  const [open, setOpen] = useState(false);
  const [eyeAngle, setEyeAngle] = useState(0);
  const [talking, setTalking] = useState(false);
  const [latestBroadcast, setLatestBroadcast] = useState(null);
  const [typedText, setTypedText] = useState("");
  const [catHovered, setCatHovered] = useState(false);
  const typingRef = useRef(null);

  // typing effect when bubble appears
  useEffect(() => {
    if (!talking || !latestBroadcast) return;
    const full = latestBroadcast.title;
    let i = 0;
    typingRef.current = setInterval(() => {
      i++;
      setTypedText(full.slice(0, i));
      if (i >= full.length) clearInterval(typingRef.current);
    }, 40);
    return () => clearInterval(typingRef.current);
  }, [talking, latestBroadcast]);
  const btnRef = useRef(null);
  const talkTimerRef = useRef(null);

  useEffect(() => {
    const now = new Date().toISOString();
    supabase
      .from("broadcasts")
      .select("*")
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setBroadcasts(data);
          setLatestBroadcast(data[0]);
          talkTimerRef.current = setTimeout(() => setTalking(true), 1200);
        }
      });
    return () => clearTimeout(talkTimerRef.current);
  }, []);

  // eye tracking
  useEffect(() => {
    const handleMove = (e) => {
      if (!btnRef.current) return;
      const rect = btnRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const angle = Math.atan2(e.clientY - cy, e.clientX - cx);
      setEyeAngle(angle);
    };
    window.addEventListener("mousemove", handleMove);
    return () => window.removeEventListener("mousemove", handleMove);
  }, []);

  const handleOpen = () => {
    setOpen(true);
    setTalking(false);
  };

  const formatDate = (iso) => {
    if (!iso) return "";
    return new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <>
      {/* floating button */}
      <div
        style={{
          position: "fixed",
          bottom: 24,
          right: 20,
          zIndex: 100,
          display: "flex",
          alignItems: "flex-end",
        }}
      >
        {/* speech bubble — left side */}
        {talking && latestBroadcast && !open && (
          <div
            style={{
              background: "var(--surface, #fff)",
              border: "1.5px solid var(--border-strong, #e2e8f0)",
              borderRadius: 12,
              padding: "9px 13px 9px 11px",
              maxWidth: 210,
              fontSize: 12,
              color: "var(--fg)",
              boxShadow: "var(--shadow-md, 0 4px 16px rgba(0,0,0,0.1))",
              marginRight: 10,
              position: "relative",
              lineHeight: 1.55,
              cursor: "pointer",
              flexShrink: 0,
            }}
            onClick={handleOpen}
          >
            <div style={{ fontWeight: 700, color: "var(--primary)", marginBottom: 3, fontSize: 11 }}>📢 ประกาศใหม่</div>
            <div style={{ minHeight: 18 }}>
              {typedText}
              <span style={{ display: "inline-block", width: 2, height: "1em", background: "var(--fg)", marginLeft: 1, verticalAlign: "text-bottom", animation: "catCursor .6s step-end infinite" }} />
            </div>
            {/* tail pointing right */}
            <div style={{
              position: "absolute",
              right: -8,
              bottom: 18,
              width: 0,
              height: 0,
              borderTop: "7px solid transparent",
              borderBottom: "7px solid transparent",
              borderLeft: "8px solid var(--border-strong, #e2e8f0)",
            }} />
            <div style={{
              position: "absolute",
              right: -6,
              bottom: 19,
              width: 0,
              height: 0,
              borderTop: "6px solid transparent",
              borderBottom: "6px solid transparent",
              borderLeft: "7px solid var(--surface, #fff)",
            }} />
            <button
              onClick={(e) => { e.stopPropagation(); setTalking(false); }}
              style={{ position: "absolute", top: 4, right: 6, background: "none", border: "none", cursor: "pointer", color: "var(--subtle)", fontSize: 14, lineHeight: 1, padding: 0 }}
            >×</button>
          </div>
        )}
        <style>{`@keyframes catCursor { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>

        {/* cat button */}
        <button
          ref={btnRef}
          onClick={handleOpen}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
            filter: "drop-shadow(0 3px 8px rgba(0,0,0,0.15))",
            transition: "transform 0.15s",
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.1)"; setCatHovered(true); }}
          onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; setCatHovered(false); }}
          title="ประกาศจากระบบ"
        >
          <CatFaceEyes eyeAngle={eyeAngle} hovered={catHovered} />
          {broadcasts.length > 0 && (
            <div style={{
              position: "absolute",
              top: -4,
              right: -4,
              background: "#ef4444",
              color: "#fff",
              borderRadius: "50%",
              width: 18,
              height: 18,
              fontSize: 10,
              fontWeight: 700,
              display: "grid",
              placeItems: "center",
              border: "2px solid #fff",
            }}>
              {broadcasts.length > 9 ? "9+" : broadcasts.length}
            </div>
          )}
        </button>
      </div>

      {/* modal */}
      {open && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
          onClick={() => setOpen(false)}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: 480,
              maxHeight: "80vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              borderRadius: 16,
              boxShadow: "var(--shadow-lg, 0 8px 32px rgba(0,0,0,0.14))",
              padding: 0,
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* header */}
            <div className="card-h" style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 18px" }}>
              <div style={{ flex: 1 }}>
                <div className="title">📢 ประกาศจากระบบ</div>
                <div className="desc t-xs">{broadcasts.length} รายการ</div>
              </div>
              <button className="iconbtn ghost" onClick={() => setOpen(false)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </button>
            </div>
            {/* list */}
            <div style={{ overflowY: "auto", padding: "10px 14px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
              {broadcasts.length === 0 ? (
                <div className="muted t-sm" style={{ textAlign: "center", padding: "32px 0" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>😸</div>
                  ยังไม่มีประกาศ
                </div>
              ) : (
                broadcasts.map(b => (
                  <div key={b.id} className="card" style={{
                    background: b.pinned ? "var(--primary-soft)" : "var(--muted)",
                    border: `1.5px solid ${b.pinned ? "var(--primary-soft-fg, #bfdbfe)" : "var(--border)"}`,
                    borderRadius: 10,
                    padding: "10px 12px",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                      {b.pinned && <span style={{ fontSize: 12 }}>📌</span>}
                      <span className="fw-7 t-sm" style={{ flex: 1, color: b.pinned ? "var(--primary)" : "var(--fg)" }}>{b.title}</span>
                      <span className="t-xs muted" style={{ whiteSpace: "nowrap" }}>{formatDate(b.created_at)}</span>
                    </div>
                    <div className="t-sm pretty" style={{ color: "var(--fg)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{b.body}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
