"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";
import Icon from "@/components/ui/Icon";
import { statusBadge } from "@/components/ui/Primitives";
import { PageHead } from "@/components/ui/Shared";
import Loading from "@/components/ui/Loading";
import Table from "@/components/ui/Table";

export default function Reports() {
  const router = useRouter();
  const nav = (path) => router.push(path);
  const toast = (msg) => alert(msg);

  const [course, setCourse] = React.useState(null);
  const [scope, setScope] = React.useState("all");
  const cols = [["ชื่อ-นามสกุล", true], ["รหัสนักศึกษา", true], ["Section", true], ["Pre-test", true], ["Post-test", true], ["คะแนนใบงาน", true], ["คะแนนตาม Rubric (รายเกณฑ์)", false], ["สถานะการส่ง", true], ["วันที่ส่ง", false]];
  const [sel, setSel] = React.useState(cols.map((c) => c[1]));
  
  const [courses, setCourses] = React.useState([]);
  const [students, setStudents] = React.useState([]);
  const [testScores, setTestScores] = React.useState([]);
  const [submissions, setSubmissions] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function load() {
      const [cRes, uRes, tRes, sRes] = await Promise.all([
        supabase.from("courses").select("*"),
        supabase.from("users").select("*").eq("role", "student"),
        supabase.from("test_scores").select("*"),
        supabase.from("submissions").select("*")
      ]);
      
      setCourses(cRes.data || []);
      setStudents(uRes.data || []);
      setTestScores(tRes.data || []);
      setSubmissions(sRes.data || []);
      
      if (cRes.data && cRes.data.length > 0) {
         setCourse(cRes.data[0].id);
      }
      setLoading(false);
    }
    load();
  }, []);

  const exportToExcel = () => {
    if (students.length === 0) {
      toast("ไม่มีข้อมูลสำหรับส่งออก");
      return;
    }

    const cObj = courses.find((c) => c.id === course);
    const fileName = cObj ? `${cObj.code}_คะแนนรวม` : "คะแนนรวม";

    const dataToExport = students.map((s) => {
      const r = testScores.find((x) => x.student_id === s.id) || {};
      const sub = submissions.find((x) => x.student_id === s.id) || {};
      
      const row = {};
      if (sel[0]) row["ชื่อ-นามสกุล"] = s.name;
      if (sel[1]) row["รหัสนักศึกษา"] = s.student_no || "-";
      if (sel[2]) row["Section"] = s.section || "-";
      if (sel[3]) row["Pre-test"] = r.pre ?? "-";
      if (sel[4]) row["Post-test"] = r.post ?? "-";
      if (sel[5]) row["คะแนนใบงาน"] = sub.score ?? "-";
      if (sel[6]) row["คะแนนตาม Rubric (รายเกณฑ์)"] = sub.score != null ? "ประเมินแล้ว" : "-";
      if (sel[7]) row["สถานะการส่ง"] = sub.status === "graded" ? "ตรวจแล้ว" : sub.status === "submitted" ? "ส่งแล้ว" : "ยังไม่ส่ง";
      if (sel[8]) row["วันที่ส่ง"] = sub.submitted_at || "-";
      
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Scores");
    
    XLSX.writeFile(workbook, `${fileName}.${scope === "csv" ? "csv" : "xlsx"}`);
    toast(`ดาวน์โหลด ${fileName}.${scope === "csv" ? "csv" : "xlsx"} สำเร็จ`);
  };

  const mobile = false;

  if (loading) return <Loading className="container p-5 text-center muted" />;

  return (
    <div className="container">
      <PageHead kicker="ระบบหลังบ้าน" title="รายงานและส่งออกคะแนน"
        desc="สรุปผลการเรียน คะแนนแบบทดสอบ และคะแนนใบงาน พร้อมส่งออกเป็นไฟล์ Excel" />

      <div className="flex gap-5 items-start" style={{ flexDirection: mobile ? "column" : "row" }}>
        <div className="flex-1" style={{ minWidth: 0 }}>
          {/* filters */}
          <div className="card card-p mb-4">
            <div className="t-sm fw-7 mb-3 flex items-center gap-2"><Icon name="filter" size={16} className="c-primary" />ตัวกรองข้อมูล</div>
            <div className="grid grid-3 gap-3">
              <div><label className="label">รายวิชา</label><select className="input" value={course || ""} onChange={(e) => setCourse(e.target.value)}>{courses.map((c) => <option key={c.id} value={c.id}>{c.code} {c.title}</option>)}</select></div>
              <div><label className="label">บทเรียน / ใบงาน</label><select className="input"><option>ทุกบทเรียน</option><option>บทที่ 1 — หัวใจล้มเหลว</option><option>ใบงานที่ 1</option></select></div>
              <div><label className="label">Section</label><select className="input"><option>ทุก Section</option><option>Sec 1</option><option>Sec 2</option></select></div>
            </div>
          </div>

          {/* columns */}
          <div className="card mb-4">
            <div className="card-h"><div className="title">เลือกคอลัมน์ที่ต้องการส่งออก</div></div>
            <div className="card-p grid grid-2 gap-2">
              {cols.map((c, i) => (
                <button key={i} onClick={() => setSel((s) => s.map((v, j) => j === i ? !v : v))} className="flex items-center gap-2 t-sm" style={{ padding: "9px 12px", borderRadius: 9, cursor: "pointer", textAlign: "left", border: "1px solid " + (sel[i] ? "var(--primary)" : "var(--border-strong)"), background: sel[i] ? "var(--primary-soft)" : "#fff" }}>
                  <span style={{ width: 18, height: 18, borderRadius: 5, flex: "0 0 18px", border: "1.5px solid " + (sel[i] ? "var(--primary)" : "#cbd5e1"), background: sel[i] ? "var(--primary)" : "#fff", display: "grid", placeItems: "center", color: "#fff" }}>{sel[i] && <Icon name="check" size={12} />}</span>
                  <span style={{ fontWeight: sel[i] ? 600 : 400 }}>{c[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* preview table */}
          <div className="card">
            <div className="card-h flex items-center justify-between"><div className="title">ตัวอย่างข้อมูล</div><span className="t-xs muted">{students.length} แถว</span></div>
            <div style={{ overflowX: "auto" }}>
              <Table
                className="table"
                headers={["ชื่อ-นามสกุล", "รหัส", "Sec", "Pre", "Post", "ใบงาน", "สถานะ"]}
                data={students.slice(0, 10)}
                colSpan={7}
                renderRow={(s) => { 
                  const r = testScores.find((x) => x.student_id === s.id) || {}; 
                  const sub = submissions.find((x) => x.student_id === s.id); 
                  return (
                    <tr key={s.id}>
                      <td className="fw-5">{s.name}</td><td className="num">{s.student_no || "-"}</td><td className="t-sm">{s.section || "-"}</td>
                      <td className="num">{r.pre ?? "-"}</td><td className="num">{r.post ?? "-"}</td>
                      <td className="num">{sub && sub.score != null ? sub.score : "-"}</td>
                      <td>{statusBadge(sub ? sub.status : "not-submitted")}</td>
                    </tr>
                  ); 
                }}
              />
            </div>
          </div>
        </div>

        {/* export panel */}
        <div style={{ width: mobile ? "100%" : 310, flex: mobile ? "1" : "0 0 310px", position: mobile ? "static" : "sticky", top: 18 }}>
          <div className="card" style={{ overflow: "hidden" }}>
            <div style={{ background: "linear-gradient(120deg,#15803d,#0f6b32)", padding: 18, color: "#fff" }}>
              <div className="flex items-center gap-2"><div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(255,255,255,.18)", display: "grid", placeItems: "center" }}><Icon name="excel" size={20} /></div><div><div className="fw-7">ส่งออกเป็น Excel</div><div className="t-xs" style={{ opacity: .85 }}>.xlsx · พร้อมใช้งาน</div></div></div>
            </div>
            <div className="card-p">
              <div className="flex items-center justify-between t-sm mb-2"><span className="muted">รายวิชา</span><span className="fw-6">{courses.find((c) => c.id === course)?.code || "-"}</span></div>
              <div className="flex items-center justify-between t-sm mb-2"><span className="muted">จำนวนแถว</span><span className="fw-6">{students.length} คน</span></div>
              <div className="flex items-center justify-between t-sm mb-3"><span className="muted">คอลัมน์ที่เลือก</span><span className="fw-6">{sel.filter(Boolean).length} คอลัมน์</span></div>
              <hr className="divider mb-3" />
              <label className="label">รูปแบบไฟล์</label>
              <div className="flex gap-2 mb-3">
                <button onClick={() => setScope("all")} className="flex-1 btn btn-sm" style={{ border: "1px solid " + (scope === "all" ? "var(--primary)" : "var(--border-strong)"), background: scope === "all" ? "var(--primary-soft)" : "#fff", color: scope === "all" ? "var(--primary-soft-fg)" : "var(--fg)" }}>Excel (.xlsx)</button>
                <button onClick={() => setScope("csv")} className="flex-1 btn btn-sm" style={{ border: "1px solid " + (scope === "csv" ? "var(--primary)" : "var(--border-strong)"), background: scope === "csv" ? "var(--primary-soft)" : "#fff", color: scope === "csv" ? "var(--primary-soft-fg)" : "var(--fg)" }}>CSV</button>
              </div>
              <button className="btn btn-primary btn-block btn-lg" onClick={exportToExcel}><Icon name="download" size={17} />ดาวน์โหลดคะแนน</button>
              <div className="t-xs muted center mt-2">ไฟล์จะรวมแยกชีตตามบทเรียน</div>
            </div>
          </div>

          <div className="card card-p mt-4">
            <div className="t-sm fw-7 mb-2">ส่งออกล่าสุด</div>
            {[["NUR301_คะแนนรวม.xlsx", "วันนี้ 09:41"], ["ใบงาน1_Sec1.xlsx", "เมื่อวาน"]].map((f, i) => (
              <div key={i} className="flex items-center gap-2 t-sm" style={{ padding: "8px 0", borderBottom: i === 0 ? "1px solid var(--border)" : 0 }}>
                <Icon name="excel" size={16} className="c-success" /><span className="flex-1 truncate">{f[0]}</span><span className="t-xs muted">{f[1]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
