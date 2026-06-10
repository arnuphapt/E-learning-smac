"use client";

import React from "react";
import Icon from "./Icon";

export function PageHead({ kicker, title, desc, right }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-5 wrap">
      <div>
        {kicker && <div className="t-xs fw-6 uppercase c-primary mb-1">{kicker}</div>}
        <div className="t-3xl fw-7 serif" style={{ color: "var(--fg)", letterSpacing: "-.01em" }}>{title}</div>
        {desc && <div className="muted mt-1 pretty" style={{ maxWidth: 620 }}>{desc}</div>}
      </div>
      {right}
    </div>
  );
}

export function Crumb({ items, nav }) {
  const root = items[0] && items[0].to;
  return (
    <div className="crumb">
      <span className="home" onClick={() => nav(root || items[0].to || "/s/courses")} title="หน้าหลัก"><Icon name="home" size={15} /></span>
      {items.map((it, i) => (
        <React.Fragment key={i}>
          <span className="sep"><Icon name="chevR" size={14} /></span>
          {it.to
            ? <span className="seg" onClick={() => nav(it.to)}>{it.label}</span>
            : <span className="seg cur">{it.label}</span>}
        </React.Fragment>
      ))}
    </div>
  );
}
