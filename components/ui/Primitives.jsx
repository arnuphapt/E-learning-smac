"use client";

import React from "react";
import Icon from "./Icon";

export function Avatar({ name, size = 34, color, src }) {
  const initials = (name || "?").trim().slice(0, 1);
  return (
    <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.42, background: color, display: "inline-flex", alignItems: "center", justifyContent: "center", overflow: "hidden", borderRadius: "50%" }}>
      {src ? (
        <img src={src} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        initials
      )}
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

export function StatusBadge({ status, showPublish = false }) {
  if (!status) return null;
  if (!showPublish && (status === "active" || status === "draft")) return null;
  
  const map = {
    // Lesson & Course Publish Status
    "active": ["success", "เผยแพร่แล้ว"],
    "draft": ["muted", "ฉบับร่าง"],
    
    // Assignment Submissions
    "graded": ["success", "ตรวจแล้ว"],
    "submitted": ["info", "ส่งแล้ว"],
    "not-submitted": ["muted", "ยังไม่ส่ง"],
    "late": ["danger", "ส่งล่าช้า"],
    
    // Student Lesson Progress
    "in-progress": ["primary", "กำลังเรียน"],
    "not-started": ["outline", "ยังไม่เริ่ม"],
    "locked-pretest": ["warning", "ต้องทำ Pre-test"],
    
    // General Administration Statuses
    "archived": ["muted", "จัดเก็บแล้ว"],
    "upcoming": ["primary", "กำลังจะมาถึง"]
  };
  
  const [tone, label] = map[status] || ["muted", status];
  return <Badge tone={tone} dot>{label}</Badge>;
}

export function statusBadge(status, showPublish = false) {
  return <StatusBadge status={status} showPublish={showPublish} />;
}

export function Select({ value, onChange, children, className, style, disabled }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef(null);

  // Recursively extract option elements from children
  const options = [];
  const parseChildren = (childrenArray) => {
    React.Children.forEach(childrenArray, child => {
      if (!child) return;
      if (child.type === "option" || (child.props && child.props.value !== undefined && child.type !== "optgroup")) {
        options.push({
          type: "option",
          value: child.props.value,
          label: child.props.children,
          disabled: child.props.disabled
        });
      } else if (child.type === "optgroup") {
        options.push({
          type: "group-header",
          label: child.props.label
        });
        if (child.props.children) {
          parseChildren(React.Children.toArray(child.props.children));
        }
      } else if (child.type === React.Fragment && child.props.children) {
        parseChildren(React.Children.toArray(child.props.children));
      } else if (Array.isArray(child)) {
        parseChildren(child);
      }
    });
  };
  parseChildren(React.Children.toArray(children));

  const selectedOption = options.find(o => o.type === "option" && String(o.value) === String(value)) || options.find(o => o.type === "option");

  React.useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (val) => {
    if (onChange) {
      onChange({ target: { value: val } });
    }
    setIsOpen(false);
  };

  const cleanClassName = (className || "")
    .split(" ")
    .filter((c) => c.trim() !== "input")
    .join(" ");

  return (
    <div ref={containerRef} className={`custom-select-container ${cleanClassName}`} style={{ position: "relative", ...style }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="input flex items-center justify-between"
        style={{
          textAlign: "left",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: disabled ? "not-allowed" : "pointer",
          gap: 8
        }}
      >
        <span className="truncate" style={{ flex: 1 }}>{selectedOption?.label || ""}</span>
        <Icon name="chevD" size={16} className="muted" style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.25s", flexShrink: 0 }} />
      </button>

      {isOpen && (
        <div
          className="card shadow-lg"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            marginTop: 6,
            zIndex: 9999,
            maxHeight: 260,
            overflowY: "auto",
            padding: 4,
            background: "var(--card)",
            borderColor: "var(--border)",
            animation: "selectFadeIn 0.15s cubic-bezier(0.16, 1, 0.3, 1)"
          }}
        >
          {options.map((o, idx) => {
            if (o.type === "group-header") {
              return (
                <div
                  key={idx}
                  style={{
                    padding: "6px 12px 2px",
                    fontSize: 10,
                    fontWeight: 700,
                    color: "var(--subtle)",
                    textTransform: "uppercase",
                    letterSpacing: 0.5
                  }}
                >
                  {o.label}
                </div>
              );
            }

            return (
              <button
                key={idx}
                type="button"
                disabled={o.disabled}
                onClick={() => handleSelect(o.value)}
                className="flex items-center"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: 0,
                  textAlign: "left",
                  fontSize: 13.5,
                  background: String(o.value) === String(value) ? "var(--primary-soft)" : "transparent",
                  color: String(o.value) === String(value) ? "var(--primary-soft-fg)" : "var(--fg)",
                  cursor: o.disabled ? "not-allowed" : "pointer",
                  fontWeight: String(o.value) === String(value) ? 600 : 400,
                  transition: "background 0.12s",
                  opacity: o.disabled ? 0.5 : 1
                }}
                onMouseOver={(e) => {
                  if (String(o.value) !== String(value) && !o.disabled) {
                    e.currentTarget.style.background = "var(--muted)";
                  }
                }}
                onMouseOut={(e) => {
                  if (String(o.value) !== String(value)) {
                    e.currentTarget.style.background = "transparent";
                  }
                }}
              >
                <span className="truncate">{o.label}</span>
              </button>
            );
          })}
        </div>
      )}
      <style>{`
        @keyframes selectFadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
