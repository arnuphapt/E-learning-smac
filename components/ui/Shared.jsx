"use client";

import React from "react";
import Link from "next/link";
import Icon from "./Icon";

export function PageHead({ kicker, title, desc, right }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-5 wrap">
      <div>
        {kicker && <div className="t-xs fw-6 uppercase c-primary mb-1">{kicker}</div>}
        <h1 className="t-3xl fw-7 serif" style={{ color: "var(--fg)", letterSpacing: "-.01em", margin: 0 }}>{title}</h1>
        {desc && <div className="muted mt-1 pretty" style={{ maxWidth: 620 }}>{desc}</div>}
      </div>
      {right}
    </div>
  );
}

export function Crumb({ items = [], nav }) {
  const root = items[0] && items[0].to;
  const homeHref = root || (items[0] && items[0].to) || "/s/courses";
  return (
    <nav aria-label="Breadcrumb" className="crumb">
      <Link href={homeHref} className="home" title="หน้าหลัก">
        <Icon name="home" size={15} />
      </Link>
      {items.map((it, i) => (
        <React.Fragment key={i}>
          <span className="sep" aria-hidden="true"><Icon name="chevR" size={14} /></span>
          {it.to ? (
            <Link href={it.to} className="seg" onClick={it.onClick}>
              {it.label}
            </Link>
          ) : it.onClick ? (
            <button
              type="button"
              className="seg"
              onClick={it.onClick}
              style={{ border: 0, background: "transparent", font: "inherit" }}
            >
              {it.label}
            </button>
          ) : (
            <span className="seg cur" aria-current="page">{it.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
