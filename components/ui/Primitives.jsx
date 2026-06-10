"use client";

import Icon from "./Icon";

export function Avatar({ name, size = 34, color }) {
  const initials = (name || "?").trim().slice(0, 1);
  return (
    <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.42, background: color }}>
      {initials}
    </div>
  );
}

export function Badge({ children, tone = "muted", dot }) {
  return <span className={"badge badge-" + tone}>{dot && <i className="dot" />}{children}</span>;
}

export function Progress({ value, h = 8 }) {
  return <div className="progress" style={{ height: h }}><i style={{ width: Math.max(0, Math.min(100, value)) + "%" }} /></div>;
}

export function Ph({ label, h = 180, style }) {
  return <div className="ph" style={{ height: h, ...style }}>{label}</div>;
}

export function Dialog({ title, desc, children, footer, onClose, lg }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className={"dialog scroll" + (lg ? " lg" : "")} onClick={(e) => e.stopPropagation()}>
        <div className="dialog-h flex items-start justify-between">
          <div>
            <div className="t">{title}</div>
            {desc && <div className="d pretty">{desc}</div>}
          </div>
          <button className="iconbtn ghost" onClick={onClose}><Icon name="x" size={18} /></button>
        </div>
        <div className="dialog-b">{children}</div>
        {footer && <div className="dialog-f">{footer}</div>}
      </div>
    </div>
  );
}

export function Toast({ msg, icon = "checkC" }) {
  if (!msg) return null;
  return <div className="toast"><Icon name={icon} size={17} />{msg}</div>;
}

export function Ring({ value, total, size = 132, label }) {
  const pct = total ? value / total : 0;
  const r = size / 2 - 11;
  const c = 2 * Math.PI * r;
  const tone = pct >= 0.8 ? "var(--success)" : pct >= 0.5 ? "var(--primary)" : "var(--warning)";
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--muted)" strokeWidth="11" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={tone} strokeWidth="11"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset .9s cubic-bezier(.2,.8,.2,1)" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}>
        <div>
          <div style={{ fontSize: size * 0.3, fontWeight: 700, lineHeight: 1, color: tone, fontVariantNumeric: "tabular-nums" }}>{value}</div>
          <div className="muted t-xs" style={{ marginTop: 2 }}>{label || "จาก " + total}</div>
        </div>
      </div>
    </div>
  );
}

export function statusBadge(status) {
  const map = {
    "graded": ["success", "ตรวจแล้ว"],
    "submitted": ["info", "ส่งแล้ว"],
    "not-submitted": ["muted", "ยังไม่ส่ง"],
    "late": ["warning", "ส่งล่าช้า"],
    "in-progress": ["primary", "กำลังเรียน"],
    "not-started": ["outline", "ยังไม่เริ่ม"],
    "locked-pretest": ["warning", "ต้องทำ Pre-test"],
  };
  const [tone, label] = map[status] || ["muted", status];
  return <Badge tone={tone} dot>{label}</Badge>;
}
