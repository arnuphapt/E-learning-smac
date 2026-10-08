"use client";

import React, { useState } from "react";
import Icon from "@/components/ui/Icon";
import { Dialog } from "@/components/ui/Primitives";

// Searchable multi-pick used by the tutor workspace (students by email, instructors by id).
// items: [{ id, label, sub }]; selected: [id]; onSave(selectedIds) may be async.
export default function PickerDialog({ title, desc, items, selected, onClose, onSave }) {
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState(selected);
  const [saving, setSaving] = useState(false);
  const needle = q.trim().toLowerCase();
  const shown = needle ? items.filter((it) => (it.label + " " + (it.sub || "")).toLowerCase().includes(needle)) : items;
  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const save = async () => {
    setSaving(true);
    await onSave(picked);
    setSaving(false);
  };

  return (
    <Dialog title={title} desc={desc} onClose={onClose}
      footer={
        <>
          <span className="t-xs muted" style={{ marginRight: "auto", alignSelf: "center" }}>เลือกแล้ว {picked.length} รายการ</span>
          <button className="btn btn-outline" onClick={onClose}>ยกเลิก</button>
          <button className="btn btn-primary" onClick={save} disabled={saving}><Icon name="check" size={15} />ตกลง</button>
        </>
      }>
      <div className="rel mb-3">
        <Icon name="search" size={15} className="abs muted" style={{ left: 12, top: 12 }} />
        <input className="input" style={{ paddingLeft: 36 }} placeholder="ค้นหา…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div style={{ maxHeight: 340, overflowY: "auto" }}>
        {shown.length === 0 && <div className="t-sm muted text-center p-4">ไม่พบรายการ</div>}
        {shown.map((it) => (
          <label key={it.id} className="flex items-center gap-3" style={{ padding: "9px 6px", borderBottom: "1px solid var(--border)", cursor: "pointer" }}>
            <input type="checkbox" checked={picked.includes(it.id)} onChange={() => toggle(it.id)} />
            <span style={{ minWidth: 0 }}>
              <span className="t-sm fw-6">{it.label}</span>
              {it.sub && <span className="t-xs muted truncate" style={{ display: "block" }}>{it.sub}</span>}
            </span>
          </label>
        ))}
      </div>
    </Dialog>
  );
}
