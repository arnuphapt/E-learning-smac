"use client";

import React, { useRef, useEffect, useId } from "react";
import Icon from "./Icon";
import { getFocusableElements, registerDialogKeyHandler } from "./dialog-focus";

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

function DialogContent({ title, desc, children, footer, onClose, lg }) {
  const dialogRef = useRef(null);
  const prevActiveElement = useRef(null);
  const titleId = useId();

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    prevActiveElement.current = document.activeElement;

    const focusables = getFocusableElements(dialogRef.current);
    const autoFocusEl = dialogRef.current?.querySelector('[autofocus], [data-autofocus]');
    const initialTarget = autoFocusEl || focusables[0] || dialogRef.current;
    initialTarget?.focus();

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onCloseRef.current?.();
        return;
      }

      if (e.key === "Tab") {
        const currentFocusables = getFocusableElements(dialogRef.current);
        if (currentFocusables.length === 0) {
          e.preventDefault();
          dialogRef.current?.focus();
          return;
        }

        const first = currentFocusables[0];
        const last = currentFocusables[currentFocusables.length - 1];

        if (e.shiftKey) {
          if (
            document.activeElement === first ||
            document.activeElement === dialogRef.current ||
            !dialogRef.current?.contains(document.activeElement)
          ) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (
            document.activeElement === last ||
            document.activeElement === dialogRef.current ||
            !dialogRef.current?.contains(document.activeElement)
          ) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    const unregister = registerDialogKeyHandler(handleKeyDown);
    return () => {
      if (!unregister()) return;
      const prev = prevActiveElement.current;
      if (prev && prev !== document.body && typeof prev.focus === "function") {
        if (!("isConnected" in prev) || prev.isConnected) {
          prev.focus();
        }
      }
    };
  }, []);

  return (
    <div className="overlay" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        tabIndex={-1}
        className={"dialog scroll" + (lg ? " lg" : "")}
        onClick={(e) => e.stopPropagation()}
        style={{ outline: "none" }}
      >
        <div className="dialog-h flex items-start justify-between">
          <div>
            <div className="t" id={titleId}>{title}</div>
            {desc && <div className="d pretty">{desc}</div>}
          </div>
          <button type="button" className="iconbtn ghost" onClick={onClose} aria-label="ปิด">
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="dialog-b">{children}</div>
        {footer && <div className="dialog-f">{footer}</div>}
      </div>
    </div>
  );
}

export function Dialog({ open = true, title, desc, children, footer, onClose, lg }) {
  if (!open) return null;
  return (
    <DialogContent
      title={title}
      desc={desc}
      footer={footer}
      onClose={onClose}
      lg={lg}
    >
      {children}
    </DialogContent>
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

export function Select({
  value,
  onChange,
  children,
  className,
  style,
  disabled,
  id,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
  ...rest
}) {
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
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || rest["ariaLabel"]}
        aria-labelledby={ariaLabelledby || rest["ariaLabelledby"]}
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
