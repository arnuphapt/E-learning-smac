"use client";

import React, { useRef, useState } from "react";
import Icon from "@/components/ui/Icon";
import { Badge, Dialog } from "@/components/ui/Primitives";
import { toast } from "@/components/ui/Toast";
import { parseImportRows, TEMPLATE_HEADERS, TEMPLATE_EXAMPLES, MAX_IMPORT_ROWS } from "@/lib/tutor-import";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

// xlsx is loaded on demand: the bank page only needs it when the instructor imports or downloads the template.
const loadXlsx = async () => {
  const m = await import("xlsx");
  return m.utils ? m : m.default;
};

async function downloadTemplate() {
  const XLSX = await loadXlsx();
  const ws = XLSX.utils.aoa_to_sheet([TEMPLATE_HEADERS, ...TEMPLATE_EXAMPLES]);
  ws["!cols"] = [{ wch: 40 }, ...Array(5).fill({ wch: 18 }), { wch: 8 }, { wch: 32 }, { wch: 20 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "ข้อสอบ");
  XLSX.writeFile(wb, "ตัวอย่างนำเข้าข้อสอบ.xlsx");
}

// onImport(items) -> { imported, failed: [{ row, message }] }. The dialog stays open on partial failure and keeps the
// failed rows (ticked, with the reason) so the instructor can retry them.
export default function BankImport({ topics, onClose, onImport }) {
  const fileRef = useRef(null);
  const [file, setFile] = useState(null); // { name, ok, errors }
  const [picked, setPicked] = useState(() => new Set());
  const [failed, setFailed] = useState({}); // row -> message from the last import attempt
  const [reading, setReading] = useState(false);
  const [busy, setBusy] = useState(false);

  const close = () => { if (!busy) onClose(); };

  const readFile = async (f) => {
    if (!f) return;
    if (f.size > MAX_FILE_BYTES) return toast("ไฟล์ใหญ่เกิน 5 MB", "error");
    setReading(true);
    try {
      const XLSX = await loadXlsx();
      const wb = XLSX.read(await f.arrayBuffer(), { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      if (!ws || !ws["!ref"]) throw new Error("ไม่พบข้อมูลในชีทแรกของไฟล์");
      const firstRow = XLSX.utils.decode_range(ws["!ref"]).s.r + 1;
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
      const { ok, errors } = parseImportRows(rows, { firstRow, existingTopics: topics });
      setFile({ name: f.name, ok, errors });
      setPicked(new Set(ok.map((q) => q.row)));
      setFailed({});
    } catch (e) {
      toast("อ่านไฟล์ไม่สำเร็จ: " + e.message, "error");
    } finally {
      setReading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const toggle = (row) => setPicked((p) => { const n = new Set(p); n.has(row) ? n.delete(row) : n.add(row); return n; });
  const allOn = file && file.ok.length > 0 && file.ok.every((q) => picked.has(q.row));
  const toggleAll = () => setPicked(allOn ? new Set() : new Set(file.ok.map((q) => q.row)));

  const confirm = async () => {
    const items = file.ok.filter((q) => picked.has(q.row));
    setBusy(true);
    let res;
    try {
      res = await onImport(items);
    } catch (e) {
      res = { imported: 0, failed: items.map((q) => ({ row: q.row, message: e.message })) };
    }
    setBusy(false);
    if (!res.failed.length) return onClose();
    const bad = Object.fromEntries(res.failed.map((f) => [f.row, f.message]));
    // imported rows leave the list; failed ones stay ticked with their reason
    setFile((cur) => ({ ...cur, ok: cur.ok.filter((q) => !picked.has(q.row) || bad[q.row]) }));
    setPicked(new Set(Object.keys(bad).map(Number)));
    setFailed(bad);
  };

  const count = file ? file.ok.filter((q) => picked.has(q.row)).length : 0;

  return (
    <Dialog title="นำเข้าข้อสอบจาก Excel" desc="ไฟล์ถูกอ่านในเบราว์เซอร์ของคุณ ไม่ได้อัปโหลดไปที่เซิร์ฟเวอร์ จนกว่าจะกดยืนยันนำเข้า" onClose={close} lg
      footer={
        <>
          <button className="btn btn-outline" onClick={close} disabled={busy}>ยกเลิก</button>
          {file && <button className="btn btn-primary" onClick={confirm} disabled={busy || count === 0}><Icon name="check" size={15} />{busy ? "กำลังนำเข้า…" : `นำเข้า ${count} ข้อ`}</button>}
        </>
      }>
      <input ref={fileRef} type="file" accept=".xlsx,.xls" hidden aria-label="เลือกไฟล์ Excel" onChange={(e) => readFile(e.target.files?.[0])} />
      <div className="flex items-center gap-2 wrap mb-3">
        <button className="btn btn-soft btn-sm" onClick={() => fileRef.current?.click()} disabled={busy || reading}><Icon name="upload" size={15} />{reading ? "กำลังอ่านไฟล์…" : file ? "เลือกไฟล์อื่น" : "เลือกไฟล์ Excel"}</button>
        <button className="btn btn-outline btn-sm" onClick={() => downloadTemplate().catch((e) => toast("สร้างไฟล์ตัวอย่างไม่สำเร็จ: " + e.message, "error"))}><Icon name="download" size={15} />ดาวน์โหลดไฟล์ตัวอย่าง</button>
        {file && <span className="t-xs muted mono" style={{ overflowWrap: "anywhere" }}>{file.name}</span>}
      </div>

      {!file && (
        <div className="t-sm muted pretty">
          <div className="mb-2">แถวแรกเป็นหัวตาราง 1 แถวต่อ 1 ข้อ (ชีทแรก ไม่เกิน {MAX_IMPORT_ROWS} ข้อต่อไฟล์)</div>
          <div className="mb-1"><b className="fg">จำเป็น</b> โจทย์ · ตัวเลือก ก · ตัวเลือก ข · เฉลย</div>
          <div className="mb-1"><b className="fg">ไม่บังคับ</b> ตัวเลือก ค, ง, จ · คำอธิบาย · หัวข้อ</div>
          <div>เฉลยใส่ ก ข ค ง จ (หรือ A-E, 1-5) และต้องชี้ไปที่ตัวเลือกที่ไม่ว่าง</div>
        </div>
      )}

      {file && (
        <>
          <div className="t-sm mb-3">
            อ่านได้ <b className="c-success">{file.ok.length}</b> ข้อ
            {file.errors.length > 0 && <> · มีปัญหา <b className="c-danger">{file.errors.length}</b> แถว (ไม่ถูกนำเข้า)</>}
          </div>

          {file.errors.length > 0 && (
            <div className="tw-imp-err mb-3" role="alert">
              <div className="fw-6 mb-1">แถวที่นำเข้าไม่ได้ แก้ในไฟล์แล้วเลือกไฟล์ใหม่</div>
              <ul>{file.errors.map((e, i) => <li key={i}>{e.row ? `แถว ${e.row}: ` : ""}{e.message}</li>)}</ul>
            </div>
          )}

          {file.ok.length > 0 && (
            <div className="tw-imp-list">
              <div className="tw-imp-row head">
                <input type="checkbox" checked={allOn} onChange={toggleAll} disabled={busy} aria-label="เลือกทุกข้อ" />
                <span>แถว</span><span>โจทย์ / ตัวเลือก</span><span>หัวข้อ</span>
              </div>
              {file.ok.map((q) => (
                <div key={q.row} className={"tw-imp-row" + (picked.has(q.row) ? "" : " off")} data-row={q.row}>
                  <input type="checkbox" checked={picked.has(q.row)} onChange={() => toggle(q.row)} disabled={busy} aria-label={"นำเข้าแถว " + q.row} />
                  <span className="mono t-xs muted" style={{ paddingTop: 2 }}>{q.row}</span>
                  <div style={{ minWidth: 0 }}>
                    <div className="t-sm fw-6 pretty mb-1">{q.text}</div>
                    <div className="flex col gap-1">
                      {q.choices.map((c) => (
                        <div key={c.id} className="flex items-center gap-2 t-xs" style={{ color: c.id === q.answer ? "var(--success)" : "var(--muted-fg)", fontWeight: c.id === q.answer ? 600 : 400 }}>
                          <Icon name={c.id === q.answer ? "checkC" : "circle"} size={13} style={{ flex: "0 0 13px" }} /><span className="pretty">{c.text}</span>
                        </div>
                      ))}
                    </div>
                    {failed[q.row] && <div className="t-xs c-danger mt-1 fw-6">นำเข้าไม่สำเร็จ: {failed[q.row]}</div>}
                  </div>
                  <div>{q.topicName ? <Badge tone="primary">{q.topicName}</Badge> : <Badge tone="muted">ไม่มีหัวข้อ</Badge>}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Dialog>
  );
}
