"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { supabase } from "@/lib/supabase";
import Icon from "@/components/ui/Icon";
import { PageHead } from "@/components/ui/Shared";
import { Avatar } from "@/components/ui/Primitives";
import Loading from "@/components/ui/Loading";

export default function StudentProfile() {
  const { data: session } = useSession();
  const router = useRouter();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const [form, setForm] = useState({
    name: "",
    student_no: "",
    section: ""
  });

  useEffect(() => {
    async function load() {
      if (session?.dbId) {
        const { data } = await supabase.from("users").select("*").eq("id", session.dbId).single();
        if (data) {
          setProfile(data);
          setForm({
            name: data.name || "",
            student_no: data.student_no || "",
            section: data.section || ""
          });
        }
      }
      setLoading(false);
    }
    load();
  }, [session]);

  const saveProfile = async () => {
    if (!session?.dbId) return;
    setSaving(true);
    const { error } = await supabase.from("users").update({
      name: form.name,
      student_no: form.student_no,
      section: form.section
    }).eq("id", session.dbId);

    if (error) {
      setMsg("เกิดข้อผิดพลาด: " + error.message);
    } else {
      setMsg("บันทึกข้อมูลเรียบร้อยแล้ว");
      setTimeout(() => setMsg(""), 3000);
    }
    setSaving(false);
  };

  if (loading) return <Loading className="container p-5 text-center muted" />;
  if (!session) return <div className="container p-5 text-center muted">กรุณาเข้าสู่ระบบ</div>;

  return (
    <div className="container" style={{ maxWidth: 640 }}>
      <PageHead title="โปรไฟล์ส่วนตัว" desc="จัดการข้อมูลส่วนตัวและตั้งค่าบัญชีของคุณ" />

      <div className="card card-p mb-5 flex items-center gap-4">
        <Avatar name={form.name || "นักศึกษา"} size={64} />
        <div className="flex-1">
          <div className="t-lg fw-7">{form.name || "นักศึกษา"}</div>
          <div className="muted">{session?.user?.email}</div>
        </div>
      </div>

      <div className="card card-p">
        <div className="t-md fw-6 mb-4">ข้อมูลส่วนตัว</div>
        
        <div className="flex col gap-3">
          <div className="field">
            <label className="label">ชื่อ-นามสกุล</label>
            <input 
              type="text" 
              className="input" 
              value={form.name} 
              onChange={(e) => setForm({...form, name: e.target.value})} 
            />
          </div>
          
          <div className="flex gap-3">
            <div className="field flex-1">
              <label className="label">รหัสนักศึกษา</label>
              <input 
                type="text" 
                className="input" 
                value={form.student_no} 
                onChange={(e) => setForm({...form, student_no: e.target.value})} 
              />
            </div>
            
            <div className="field flex-1">
              <label className="label">กลุ่มเรียน (Section)</label>
              <input 
                type="text" 
                className="input" 
                value={form.section} 
                onChange={(e) => setForm({...form, section: e.target.value})} 
                placeholder="เช่น 1, 2, 3"
              />
            </div>
          </div>
          
          <div className="field">
            <label className="label">อีเมล</label>
            <input type="text" className="input" value={session?.user?.email} disabled />
            <div className="t-xs muted mt-1">ไม่สามารถเปลี่ยนอีเมลได้ เนื่องจากล็อกอินผ่าน Google</div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-5">
          <div className="t-sm" style={{ color: msg.includes("ผิดพลาด") ? "var(--danger)" : "var(--success)" }}>
            {msg}
          </div>
          <button className="btn btn-primary" onClick={saveProfile} disabled={saving}>
            {saving ? <Icon name="loader" className="spin" size={16} /> : <Icon name="check" size={16} />}
            {saving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
          </button>
        </div>
      </div>
    </div>
  );
}
