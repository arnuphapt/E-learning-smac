"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { fileHref } from "@/lib/files";
import { bankWarning, parseDrawCount } from "@/lib/tutor-bank";
import Icon from "@/components/ui/Icon";
import { toast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/ConfirmDialog";

// Same presigned-URL flow the course lesson editor uses (R2 via /api/upload/presign). Returns the stored key.
async function uploadToR2(file, folder) {
  const presignRes = await fetch("/api/upload/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name, filetype: file.type, folder }),
  });
  if (!presignRes.ok) throw new Error("ขอสิทธิ์อัปโหลดไม่สำเร็จ");
  const { uploadUrl, key } = await presignRes.json();
  if (uploadUrl) {
    const up = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
    if (!up.ok) throw new Error("อัปโหลดไฟล์ไม่สำเร็จ ลองใหม่หรือเปลี่ยนชื่อไฟล์");
  }
  return key;
}

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const i = Math.min(3, Math.floor(Math.log(bytes) / Math.log(1024)));
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(1)) + " " + ["B", "KB", "MB", "GB"][i];
}

// One list of files stored on the lesson row (documents = students may open, ai_documents = AI reference only).
function DocList({ lesson, field, folder, title, desc, emptyText, onSave }) {
  const confirm = useConfirm();
  const docs = lesson[field] || [];
  const [busy, setBusy] = useState(false);

  const add = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const key = await uploadToR2(file, `lessons/${lesson.id}/${folder}`);
      await onSave({ [field]: [...docs, { name: file.name, size: formatBytes(file.size), path: key, url: key }] });
    } catch (err) {
      toast("อัปโหลดไม่สำเร็จ: " + err.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (doc) => {
    const ok = await confirm({ title: "ลบเอกสาร", message: `ลบ “${doc.name}” ออกจากบทนี้ใช่หรือไม่?`, danger: true, confirmText: "ลบเอกสาร", cancelText: "ยกเลิก" });
    if (ok) await onSave({ [field]: docs.filter((d) => d !== doc) });
  };

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between gap-3 wrap mb-2">
        <div>
          <div className="t-base fw-6">{title}</div>
          <div className="t-xs muted">{desc}</div>
        </div>
        <label className={"btn btn-outline btn-sm" + (busy ? " disabled" : "")} style={{ cursor: "pointer" }}>
          <Icon name={busy ? "loader" : "upload"} size={14} className={busy ? "spin" : ""} />{busy ? "กำลังอัปโหลด…" : "เพิ่มไฟล์"}
          <input type="file" onChange={add} disabled={busy} style={{ display: "none" }} />
        </label>
      </div>
      {docs.length === 0 ? (
        <div className="t-sm muted">{emptyText}</div>
      ) : docs.map((doc, i) => (
        <div key={doc.path || i} className="tw-row">
          <Icon name="file" size={16} className="muted" />
          <div className="flex-1" style={{ minWidth: 0 }}>
            <div className="t-sm fw-6 truncate">{doc.name}</div>
            <div className="t-xs muted">{doc.size}</div>
          </div>
          <a href={fileHref(doc.url)} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm"><Icon name="eye" size={14} />เปิดดู</a>
          <button className="iconbtn ghost c-danger" onClick={() => remove(doc)} aria-label={"ลบ " + doc.name}><Icon name="trash" size={15} /></button>
        </div>
      ))}
    </div>
  );
}

// Everything an instructor edits for one tutor lesson: title/description/video, publish state, how many questions a
// round draws (with the "bank too small" warning), and the lesson's documents. The questions themselves live on the bank page.
// bank = { count, topics }; save(fields) writes the lesson row and resolves true on success.
export default function LessonPanel({ lesson, bank, save, onMove, onDelete, canUp, canDown }) {
  const router = useRouter();
  const [title, setTitle] = useState(lesson.title || "");
  const [desc, setDesc] = useState(lesson.description || "");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [progress, setProgress] = useState("");
  const [saving, setSaving] = useState(false);
  const [whole, setWhole] = useState(lesson.tutor_draw_count == null);
  const [drawInput, setDrawInput] = useState(lesson.tutor_draw_count == null ? "" : String(lesson.tutor_draw_count));

  const pickFile = (f) => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  };

  const published = lesson.status === "active";
  const draft = whole ? null : parseDrawCount(drawInput);
  const warning = bankWarning(bank.count, draft ?? null);
  const hasVideo = !!(file || lesson.video_url);

  const saveDetails = async () => {
    if (!title.trim()) return toast("กรุณากรอกชื่อบทเรียน", "warning");
    setSaving(true);
    try {
      const fields = { title: title.trim(), description: desc };
      if (file) {
        setProgress("กำลังอัปโหลดวิดีโอ…");
        const key = await uploadToR2(file, `lessons/${lesson.id}/video`);
        Object.assign(fields, { video: true, video_url: key, video_path: key });
      }
      if (await save(fields)) { pickFile(null); toast("บันทึกบทเรียนแล้ว"); }
    } catch (err) {
      toast("อัปโหลดวิดีโอไม่สำเร็จ: " + err.message, "error");
    } finally {
      setSaving(false);
      setProgress("");
    }
  };

  const saveDraw = async () => {
    const value = whole ? null : parseDrawCount(drawInput);
    // unchecking "ใช้ทั้งคลัง" needs a real number: blank/invalid must not silently save NULL (= whole bank)
    if (!whole && !value) return toast("กรุณากรอกจำนวนข้อต่อรอบเป็นเลขจำนวนเต็มมากกว่า 0 หรือเลือก “ใช้ทั้งคลัง”", "error");
    if (await save({ tutor_draw_count: value })) toast("บันทึกจำนวนข้อต่อรอบแล้ว");
  };

  return (
    <div className="tw-panel">
      <div className="tw-sec">
        <div className="flex items-center justify-between gap-3 wrap mb-3">
          <div className="t-xs fw-6 muted tnum">บทที่ {lesson.index}</div>
          <div className="flex items-center gap-2 wrap">
            <div className="tw-seg" role="group" aria-label="สถานะบทเรียน">
              <button className={published ? "on" : ""} onClick={() => !published && save({ status: "active" })}>เผยแพร่</button>
              <button className={!published ? "on" : ""} onClick={() => published && save({ status: "draft" })}>ฉบับร่าง</button>
            </div>
            <button className="iconbtn" disabled={!canUp} onClick={() => onMove(-1)} aria-label="เลื่อนบทขึ้น" title="เลื่อนขึ้น"><Icon name="chevD" size={16} style={{ transform: "rotate(180deg)" }} /></button>
            <button className="iconbtn" disabled={!canDown} onClick={() => onMove(1)} aria-label="เลื่อนบทลง" title="เลื่อนลง"><Icon name="chevD" size={16} /></button>
            <button className="iconbtn c-danger" onClick={onDelete} aria-label="ลบบทเรียน" title="ลบบทเรียน"><Icon name="trash" size={15} /></button>
          </div>
        </div>
        <div className="field"><label className="label" htmlFor="tw-title">ชื่อบทเรียน <span className="c-danger">*</span></label>
          <input id="tw-title" className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="เช่น ภาวะหัวใจล้มเหลว" /></div>
        <div className="field"><label className="label" htmlFor="tw-desc">คำอธิบายบท</label>
          <textarea id="tw-desc" className="input" rows={3} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="สรุปสั้นๆ ว่าบทนี้ติวเรื่องอะไร นักศึกษาจะเห็นในหน้าบทเรียน" /></div>

        <div className="label">วิดีโอประกอบ</div>
        {(preview || lesson.video_url) && (
          <video src={preview || fileHref(lesson.video_url)} controls style={{ width: "100%", maxWidth: 560, aspectRatio: "16/9", borderRadius: 12, background: "#000", display: "block", marginBottom: 10 }} />
        )}
        <div className="flex items-center gap-3 wrap mb-4">
          <label className={"btn btn-outline btn-sm" + (saving ? " disabled" : "")} style={{ cursor: "pointer" }}>
            <Icon name="upload" size={14} />{hasVideo ? "เปลี่ยนวิดีโอ" : "เลือกไฟล์วิดีโอ"}
            <input type="file" accept="video/mp4,video/webm" onChange={(e) => pickFile(e.target.files?.[0] || null)} disabled={saving} style={{ display: "none" }} />
          </label>
          <span className="t-xs muted truncate" style={{ maxWidth: 320 }}>
            {file ? `${file.name} · อัปโหลดเมื่อกดบันทึก` : lesson.video_url ? (lesson.video_path || lesson.video_url).split("/").pop() : "ยังไม่มีวิดีโอ (ไม่บังคับ)"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn btn-primary" onClick={saveDetails} disabled={saving}><Icon name={saving ? "loader" : "check"} size={15} className={saving ? "spin" : ""} />{saving ? "กำลังบันทึก…" : "บันทึกบทเรียน"}</button>
          {progress && <span className="t-xs c-primary">{progress}</span>}
        </div>
      </div>

      <div className="tw-sec">
        <div className="tw-sec-t">คลังข้อสอบของบทนี้</div>
        <p className="tw-sec-d">ทุกรอบที่นักศึกษาทำ ระบบสุ่มข้อจากคลังนี้ จับเวลา 1 นาทีต่อข้อ</p>
        <div className="flex items-center justify-between gap-3 wrap mb-4">
          <div>
            <div className="t-xl fw-7 tnum">{bank.count} <span className="t-sm fw-5 muted">ข้อ · {bank.topics} หัวข้อ</span></div>
          </div>
          <button className="btn btn-primary" onClick={() => router.push("/i/lesson/" + lesson.id + "/bank")}><Icon name="clipboard" size={15} />เปิดคลังข้อสอบ</button>
        </div>
        <div className="label">จำนวนข้อต่อรอบ</div>
        <div className="flex items-center gap-3 wrap mb-3">
          <label className="flex items-center gap-2 t-sm" style={{ cursor: "pointer" }}>
            <input type="checkbox" checked={whole} onChange={(e) => setWhole(e.target.checked)} />ใช้ทั้งคลัง
          </label>
          <input className="input" aria-label="จำนวนข้อต่อรอบ" style={{ width: 110 }} inputMode="numeric" value={drawInput} disabled={whole}
            onChange={(e) => setDrawInput(e.target.value.replace(/[^0-9]/g, ""))} placeholder="เช่น 20" />
          <button className="btn btn-outline btn-sm" onClick={saveDraw}><Icon name="check" size={14} />บันทึกจำนวนข้อ</button>
        </div>
        {warning && <div className="tw-warn"><Icon name="alert" size={15} style={{ flex: "0 0 15px", marginTop: 2 }} /><span className="pretty">คลังไม่พอ: {warning}</span></div>}
      </div>

      <div className="tw-sec">
        <div className="tw-sec-t">เอกสาร</div>
        <p className="tw-sec-d">ไฟล์ประกอบบทนี้ แยกเป็นไฟล์ที่นักศึกษาเปิดดูได้ กับไฟล์ที่ให้ AI ใช้อ้างอิงเท่านั้น</p>
        <DocList lesson={lesson} field="documents" folder="documents" title="เอกสารประกอบสำหรับนักศึกษา" desc="PDF, Word, PowerPoint, รูปภาพ" emptyText="ยังไม่มีเอกสาร" onSave={save} />
        <DocList lesson={lesson} field="ai_documents" folder="ai_documents" title="เอกสารสำหรับ AI (นักศึกษาไม่เห็น)" desc="ให้ AI ติวเตอร์ใช้ตอบคำถามเชิงลึกของบทนี้" emptyText="ยังไม่มีเอกสาร AI ใช้ข้อมูลบทเรียนปกติ" onSave={save} />
      </div>
    </div>
  );
}
