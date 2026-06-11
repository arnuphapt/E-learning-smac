"use client";

import React, { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DATA } from "@/lib/data";
import Icon from "@/components/ui/Icon";
import { Badge, Avatar, Dialog } from "@/components/ui/Primitives";
import { PageHead } from "@/components/ui/Shared";

function mStatus(s) {
  const m = { active: ["success", "ใช้งาน"], archived: ["muted", "เก็บถาวร"], upcoming: ["info", "กำลังจะมาถึง"] };
  const [tone, label] = m[s] || ["muted", s];
  return <Badge tone={tone} dot>{label}</Badge>;
}

function RowActions({ onEdit, onDelete }) {
  return (
    <div className="flex items-center gap-1 justify-end">
      <button className="iconbtn ghost" onClick={onEdit}><Icon name="pencil" size={15} /></button>
      <button className="iconbtn ghost c-danger" onClick={onDelete}><Icon name="trash" size={15} /></button>
    </div>
  );
}

function YearDialog({ mode, row, onClose, onSave }) {
  const [year, setYear] = React.useState(row ? row.year : "");
  const [status, setStatus] = React.useState(row ? row.status : "upcoming");
  return (
    <Dialog title={mode === "add" ? "เพิ่มปีการศึกษา" : "แก้ไขปีการศึกษา"} desc="กำหนดปีการศึกษาและช่วงเวลาเปิด-ปิด" onClose={onClose}
      footer={<><button className="btn btn-outline" onClick={onClose}>ยกเลิก</button><button className="btn btn-primary" onClick={onSave}><Icon name="check" size={15} />บันทึก</button></>}>
      <div className="field"><label className="label">ปีการศึกษา (พ.ศ.) <span className="c-danger">*</span></label><input className="input" value={year} onChange={(e) => setYear(e.target.value)} placeholder="เช่น 2569" /></div>
      <div className="grid grid-2 gap-3">
        <div className="field"><label className="label">วันเริ่มต้น</label><input className="input" defaultValue={row ? row.start : ""} placeholder="1 มิ.ย. 2569" /></div>
        <div className="field"><label className="label">วันสิ้นสุด</label><input className="input" defaultValue={row ? row.end : ""} placeholder="31 พ.ค. 2570" /></div>
      </div>
      <label className="label">สถานะ</label>
      <div className="flex gap-2">
        {[["active", "ใช้งาน (ปัจจุบัน)"], ["upcoming", "กำลังจะมาถึง"], ["archived", "เก็บถาวร"]].map(([k, l]) => (
          <button key={k} onClick={() => setStatus(k)} className="flex-1 btn btn-sm" style={{ border: "1px solid " + (status === k ? "var(--primary)" : "var(--border-strong)"), background: status === k ? "var(--primary-soft)" : "#fff", color: status === k ? "var(--primary-soft-fg)" : "var(--fg)" }}>{l}</button>
        ))}
      </div>
    </Dialog>
  );
}

function GenericDialog({ title, mode, onClose, onSave }) {
  return (
    <Dialog title={mode === "add" ? title : "แก้ไขข้อมูล"} desc="กรอกรายละเอียดข้อมูลหลัก" onClose={onClose}
      footer={<><button className="btn btn-outline" onClick={onClose}>ยกเลิก</button><button className="btn btn-primary" onClick={onSave}><Icon name="check" size={15} />บันทึก</button></>}>
      <div className="field"><label className="label">ชื่อ <span className="c-danger">*</span></label><input className="input" placeholder="กรอกชื่อ…" /></div>
      <div className="field"><label className="label">รายละเอียด</label><input className="input" placeholder="รายละเอียดเพิ่มเติม (ถ้ามี)" /></div>
    </Dialog>
  );
}

function CourseAccessDialog({ mode, row, onClose, onSave }) {
  const [allowedYears, setAllowedYears] = React.useState(row?.access?.allowedYears?.join(", ") || "");
  const [allowedEmails, setAllowedEmails] = React.useState(row?.access?.allowedEmails?.join("\n") || "");

  return (
    <Dialog title="ตั้งค่าสิทธิ์การเข้าถึงรายวิชา" desc={`ตั้งค่าผู้ที่มีสิทธิ์เข้าถึงวิชา ${row?.code || ""}`} onClose={onClose}
      footer={<><button className="btn btn-outline" onClick={onClose}>ยกเลิก</button><button className="btn btn-primary" onClick={onSave}><Icon name="check" size={15} />บันทึก</button></>}>
      <div className="field">
        <label className="label">ชั้นปีนักศึกษาที่อนุญาต (คั่นด้วยลูกน้ำ)</label>
        <input className="input" value={allowedYears} onChange={(e) => setAllowedYears(e.target.value)} placeholder="เช่น 65, 66, 67" />
        <div className="t-sm muted mt-1">นักศึกษาที่มีอีเมลขึ้นต้นด้วยเลขเหล่านี้จะสามารถเข้าถึงได้</div>
      </div>
      <div className="field">
        <label className="label">อีเมลพิเศษที่อนุญาต (บรรทัดละ 1 อีเมล)</label>
        <textarea className="input" rows={4} value={allowedEmails} onChange={(e) => setAllowedEmails(e.target.value)} placeholder="student@smnc.ac.th" />
      </div>
    </Dialog>
  );
}

function UserDialog({ mode, row, onClose, onSave }) {
  const [name, setName] = React.useState(row ? row.name : "");
  const [email, setEmail] = React.useState(row ? row.email : "");
  const [role, setRole] = React.useState(row ? row.role : "student");
  const [studentId, setStudentId] = React.useState(row ? (row.role === "student" ? row.studentId : "") : "");
  const [sec, setSec] = React.useState(row ? row.sec : "Sec 1");
  const [status, setStatus] = React.useState(row ? row.status : "active");

  const handleSave = () => {
    if (!name || !email) {
      alert("กรุณากรอกข้อมูลที่จำเป็น (*) ให้ครบถ้วน");
      return;
    }
    onSave({
      name,
      email,
      role,
      studentId: role === "student" ? studentId : "อาจารย์ผู้สอน",
      sec: role === "student" ? sec : "ไม่มี",
      status
    });
  };

  return (
    <Dialog title={mode === "add" ? "เพิ่มผู้ใช้งาน" : "แก้ไขข้อมูลผู้ใช้งาน"} desc="กำหนดข้อมูลผู้ใช้งานและสิทธิ์ในระบบ" onClose={onClose}
      footer={<><button className="btn btn-outline" onClick={onClose}>ยกเลิก</button><button className="btn btn-primary" onClick={handleSave}><Icon name="check" size={15} />บันทึก</button></>}>
      <div className="field">
        <label className="label">ชื่อ-นามสกุล <span className="c-danger">*</span></label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="เช่น อ. ดร. สมชาย ใจดี หรือ ณัฐชยา ยิ้มแย้ม" />
      </div>
      <div className="field">
        <label className="label">อีเมล <span className="c-danger">*</span></label>
        <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="username@smnc.ac.th" />
      </div>
      <div className="grid grid-2 gap-3">
        <div className="field">
          <label className="label">บทบาท</label>
          <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="student">นักศึกษา</option>
            <option value="instructor">อาจารย์ผู้สอน</option>
            <option value="admin">ผู้ดูแลระบบ</option>
          </select>
        </div>
        {role === "student" ? (
          <div className="field">
            <label className="label">รหัสนักศึกษา</label>
            <input className="input" value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="เช่น 65010001" />
          </div>
        ) : (
          <div className="field">
            <label className="label">ตำแหน่ง</label>
            <input className="input" value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="เช่น อาจารย์" />
          </div>
        )}
      </div>
      
      <div className="grid grid-2 gap-3">
        {role === "student" && (
          <div className="field">
            <label className="label">Section / กลุ่มเรียน</label>
            <select className="input" value={sec} onChange={(e) => setSec(e.target.value)}>
              <option value="Sec 1">Sec 1</option>
              <option value="Sec 2">Sec 2</option>
              <option value="ไม่มี">ไม่มี</option>
            </select>
          </div>
        )}
        <div className="field">
          <label className="label">สถานะการใช้งาน</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="active">ใช้งานปกติ</option>
            <option value="suspended">ระงับการใช้งาน</option>
          </select>
        </div>
      </div>
    </Dialog>
  );
}

function MasterDataContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nav = (path) => router.push(path);
  const toast = (msg) => alert(msg);

  const tab = searchParams.get("tab") || "years";
  const [dlg, setDlg] = React.useState(null); // {mode, row}
  const D = DATA;

  const [usersList, setUsersList] = React.useState([
    { id: "u1", name: "อ. ดร. สุภาวดี ทองคำ", email: "supawadee.t@smnc.ac.th", role: "instructor", studentId: "อาจารย์ผู้สอน", sec: "ไม่มี", status: "active" },
    { id: "u2", name: "อ. กมลชนก ศรีวิไล", email: "kamolchanok.s@smnc.ac.th", role: "instructor", studentId: "อาจารย์ผู้สอน", sec: "ไม่มี", status: "active" },
    { id: "u3", name: "ณัฐนรี วงศ์สวรรค์", email: "65010001@smnc.ac.th", role: "student", studentId: "65010001", sec: "Sec 1", status: "active" },
    { id: "u4", name: "ธนกฤต อินทรชัย", email: "65010002@smnc.ac.th", role: "student", studentId: "65010002", sec: "Sec 1", status: "active" },
    { id: "u5", name: "พิมพ์ชนก ดวงแก้ว", email: "65010003@smnc.ac.th", role: "student", studentId: "65010003", sec: "Sec 1", status: "active" },
    { id: "u6", name: "ศุภวิชญ์ มากมี", email: "65010004@smnc.ac.th", role: "student", studentId: "65010004", sec: "Sec 2", status: "active" },
    { id: "u7", name: "อรปรียา สุขใจ", email: "65010005@smnc.ac.th", role: "student", studentId: "65010005", sec: "Sec 2", status: "active" },
    { id: "u8", name: "กิตติพศ เรืองศรี", email: "65010006@smnc.ac.th", role: "student", studentId: "65010006", sec: "Sec 2", status: "suspended" },
  ]);

  const tabs = [
    ["years", "ปีการศึกษา", "cal"],
    ["terms", "ภาคเรียน", "layers"],
    ["groups", "กลุ่มวิชา", "folder"],
    ["sections", "Section / กลุ่มเรียน", "users"],
    ["course_access", "สิทธิ์การเข้าถึง", "lock"],
    ["users", "จัดการผู้ใช้งาน", "user"],
  ];
  const meta = {
    years: { title: "ปีการศึกษา", add: "เพิ่มปีการศึกษา", desc: "กำหนดปีการศึกษาและช่วงเวลา ปีที่ตั้งเป็น “ใช้งาน” จะเป็นค่าเริ่มต้นของระบบ" },
    terms: { title: "ภาคเรียน", add: "เพิ่มภาคเรียน", desc: "ภาคการศึกษาภายใต้แต่ละปีการศึกษา" },
    groups: { title: "กลุ่มวิชา", add: "เพิ่มกลุ่มวิชา", desc: "กลุ่มสาขาวิชาและหัวหน้ากลุ่มผู้รับผิดชอบ" },
    sections: { title: "Section / กลุ่มเรียน", add: "เพิ่ม Section", desc: "กลุ่มเรียนของนักศึกษาในแต่ละกลุ่มวิชา" },
    course_access: { title: "สิทธิ์การเข้าถึงรายวิชา", add: "ตั้งค่าสิทธิ์", desc: "กำหนดรหัสนักศึกษา/อีเมล ที่สามารถเข้าถึงรายวิชานั้นๆ ได้" },
    users: { title: "จัดการผู้ใช้งาน", add: "เพิ่มผู้ใช้", desc: "จัดการข้อมูลผู้สอน นักศึกษา และสิทธิ์การใช้งานระบบ" },
  }[tab] || { title: "ข้อมูลหลัก", add: "เพิ่มข้อมูล", desc: "จัดการข้อมูลระบบ" };

  return (
    <div className="container">
      <PageHead kicker="ระบบหลังบ้าน · ข้อมูลหลัก (Master Data)" title="จัดการข้อมูลหลัก"
        desc="ตั้งค่าข้อมูลพื้นฐานของระบบที่ใช้ร่วมกันทุกรายวิชา" />

      <div className="flex gap-5 items-start">
        <div className="flex-1" style={{ minWidth: 0 }}>
          {/* mobile/inline tabs fallback */}
          <div className="tabs pill mb-4 only-m" style={{ display: "none" }} />
          <div className="card">
            <div className="card-h flex items-center justify-between">
              <div><div className="title">{meta.title}</div><div className="desc pretty">{meta.desc}</div></div>
              <button className="btn btn-primary btn-sm" onClick={() => setDlg({ mode: "add" })}><Icon name="plus" size={15} />{meta.add}</button>
            </div>

            {tab === "years" && (
              <table className="table">
                <thead><tr><th>ปีการศึกษา</th><th>เริ่ม</th><th>สิ้นสุด</th><th>รายวิชา</th><th>สถานะ</th><th></th></tr></thead>
                <tbody>
                  {D.academicYears.map((y) => (
                    <tr key={y.id}>
                      <td><div className="flex items-center gap-2"><div style={{ width: 34, height: 34, borderRadius: 9, background: "var(--primary-soft)", color: "var(--primary)", display: "grid", placeItems: "center" }}><Icon name="cal" size={16} /></div><span className="fw-6">{y.label}</span></div></td>
                      <td className="muted t-sm">{y.start}</td>
                      <td className="muted t-sm">{y.end}</td>
                      <td className="num">{y.courses}</td>
                      <td>{mStatus(y.status)}</td>
                      <td><RowActions onEdit={() => setDlg({ mode: "edit", row: y })} onDelete={() => toast("ลบปีการศึกษาแล้ว")} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {tab === "terms" && (
              <table className="table">
                <thead><tr><th>ภาคเรียน</th><th>ปีการศึกษา</th><th>เริ่ม</th><th>สิ้นสุด</th><th>สถานะ</th><th></th></tr></thead>
                <tbody>
                  {D.terms.map((t) => (
                    <tr key={t.id}><td className="fw-6">{t.name}</td><td className="t-sm">{t.year}</td><td className="muted t-sm">{t.start}</td><td className="muted t-sm">{t.end}</td><td>{mStatus(t.status)}</td><td><RowActions onEdit={() => setDlg({ mode: "edit", row: t })} onDelete={() => toast("ลบภาคเรียนแล้ว")} /></td></tr>
                  ))}
                </tbody>
              </table>
            )}
            {tab === "groups" && (
              <table className="table">
                <thead><tr><th>กลุ่มวิชา</th><th>หัวหน้ากลุ่ม</th><th>รายวิชา</th><th>สถานะ</th><th></th></tr></thead>
                <tbody>
                  {D.subjectGroups.map((g) => (
                    <tr key={g.id}><td className="fw-6">{g.name}</td><td className="t-sm flex items-center gap-2"><Avatar name={g.head.replace(/^อ\. (ดร\. )?/, "")} size={24} />{g.head}</td><td className="num">{g.courses}</td><td>{mStatus(g.status)}</td><td><RowActions onEdit={() => setDlg({ mode: "edit", row: g })} onDelete={() => toast("ลบกลุ่มวิชาแล้ว")} /></td></tr>
                  ))}
                </tbody>
              </table>
            )}
            {tab === "sections" && (
              <table className="table">
                <thead><tr><th>Section</th><th>กลุ่มวิชา</th><th>จำนวนนักศึกษา</th><th>สถานะ</th><th></th></tr></thead>
                <tbody>
                  {D.sectionList.map((s) => (
                    <tr key={s.id}><td><Badge tone="primary">{s.name}</Badge></td><td className="t-sm">{s.group}</td><td className="num">{s.students}</td><td>{mStatus(s.status)}</td><td><RowActions onEdit={() => setDlg({ mode: "edit", row: s })} onDelete={() => toast("ลบ Section แล้ว")} /></td></tr>
                  ))}
                </tbody>
              </table>
            )}
            {tab === "course_access" && (
              <table className="table">
                <thead><tr><th>รหัสวิชา</th><th>ชื่อวิชา</th><th>ปีนักศึกษาที่เข้าได้</th><th>อีเมลพิเศษ</th><th></th></tr></thead>
                <tbody>
                  {D.courses.map((c) => (
                    <tr key={c.id}>
                      <td><Badge tone="primary">{c.code}</Badge></td>
                      <td className="fw-6">{c.title}</td>
                      <td>{c.access?.allowedYears?.join(", ") || "-"}</td>
                      <td className="t-sm muted">{c.access?.allowedEmails?.length ? `${c.access.allowedEmails.length} อีเมล` : "-"}</td>
                      <td><RowActions onEdit={() => setDlg({ mode: "edit", row: c })} onDelete={() => toast("ลบสิทธิ์แล้ว")} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {tab === "users" && (
              <table className="table">
                <thead>
                  <tr>
                    <th>ชื่อ-นามสกุล</th>
                    <th>อีเมล</th>
                    <th>บทบาท</th>
                    <th>รหัสประจำตัว / ตำแหน่ง</th>
                    <th>กลุ่มเรียน</th>
                    <th>สถานะ</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <Avatar name={u.name.replace(/^อ\. (ดร\. )?/, "")} size={28} />
                          <span className="fw-6">{u.name}</span>
                        </div>
                      </td>
                      <td className="t-sm muted">{u.email}</td>
                      <td>
                        {u.role === "admin" ? (
                          <Badge tone="danger">ผู้ดูแลระบบ</Badge>
                        ) : u.role === "instructor" ? (
                          <Badge tone="primary">อาจารย์ผู้สอน</Badge>
                        ) : (
                          <Badge tone="info">นักศึกษา</Badge>
                        )}
                      </td>
                      <td className="tnum t-sm">{u.studentId || "-"}</td>
                      <td>{u.sec !== "ไม่มี" ? <Badge tone="outline">{u.sec}</Badge> : <span className="muted t-sm">-</span>}</td>
                      <td>
                        {u.status === "active" ? (
                          <Badge tone="success" dot>ใช้งาน</Badge>
                        ) : (
                          <Badge tone="warning" dot>ระงับ</Badge>
                        )}
                      </td>
                      <td>
                        <RowActions
                          onEdit={() => setDlg({ mode: "edit", row: u })}
                          onDelete={() => {
                            if (confirm(`ยืนยันการลบผู้ใช้ ${u.name}?`)) {
                              setUsersList((prev) => prev.filter((x) => x.id !== u.id));
                              toast("ลบผู้ใช้งานแล้ว");
                            }
                          }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {dlg && tab === "years" && <YearDialog mode={dlg.mode} row={dlg.row} onClose={() => setDlg(null)} onSave={() => { setDlg(null); toast(dlg.mode === "add" ? "เพิ่มปีการศึกษาแล้ว" : "บันทึกการแก้ไขแล้ว"); }} />}
      {dlg && tab === "course_access" && <CourseAccessDialog mode={dlg.mode} row={dlg.row} onClose={() => setDlg(null)} onSave={() => { setDlg(null); toast("บันทึกการแก้ไขสิทธิ์แล้ว"); }} />}
      {dlg && tab === "users" && (
        <UserDialog
          mode={dlg.mode}
          row={dlg.row}
          onClose={() => setDlg(null)}
          onSave={(updatedUser) => {
            setDlg(null);
            if (dlg.mode === "add") {
              const newUser = {
                ...updatedUser,
                id: "u_" + Date.now(),
              };
              setUsersList((prev) => [...prev, newUser]);
              toast("เพิ่มผู้ใช้งานเรียบร้อยแล้ว");
            } else {
              setUsersList((prev) => prev.map((u) => (u.id === dlg.row.id ? { ...u, ...updatedUser } : u)));
              toast("บันทึกการแก้ไขเรียบร้อยแล้ว");
            }
          }}
        />
      )}
      {dlg && tab !== "years" && tab !== "course_access" && tab !== "users" && <GenericDialog title={meta.add} mode={dlg.mode} onClose={() => setDlg(null)} onSave={() => { setDlg(null); toast("บันทึกข้อมูลแล้ว"); }} />}
    </div>
  );
}

export default function MasterData() {
  return (
    <Suspense fallback={<div className="container" />}>
      <MasterDataContent />
    </Suspense>
  );
}
