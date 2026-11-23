"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { CheckIcon } from "lucide-react";
import { toast } from "sonner";
import { FormField } from "@/components/common/form-field";
import { PageContainer } from "@/components/common/page-container";
import { PageHeader } from "@/components/common/page-header";
import { LoadingState } from "@/components/common/states";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { initials } from "@/components/layout/user-info";
import { supabase } from "@/lib/supabase";

export default function StudentProfile() {
  const { data: session, status: authStatus } = useSession();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", student_no: "" });

  useEffect(() => {
    // Wait for the session (role/id pick the filter/data); a run started while it loads can finish after the real run and overwrite it.
    if (authStatus !== "authenticated") return;
    let cancelled = false;
    async function load() {
      if (session?.dbId) {
        const { data } = await supabase.from("users").select("*").eq("id", session.dbId).single();
        if (cancelled) return;
        if (data) setForm({ name: data.name || "", student_no: data.student_no || "" });
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [session, authStatus]);

  const saveProfile = async () => {
    if (!session?.dbId) return;
    setSaving(true);
    const { error } = await supabase.from("users").update({ name: form.name, student_no: form.student_no }).eq("id", session.dbId);
    if (error) toast.error("เกิดข้อผิดพลาด: " + error.message);
    else toast.success("บันทึกข้อมูลเรียบร้อยแล้ว");
    setSaving(false);
  };

  if (loading) return <PageContainer><LoadingState /></PageContainer>;
  if (!session) return <PageContainer><p className="p-8 text-center text-muted-foreground">กรุณาเข้าสู่ระบบ</p></PageContainer>;

  return (
    <PageContainer className="max-w-2xl">
      <PageHeader title="โปรไฟล์ส่วนตัว" description="จัดการข้อมูลส่วนตัวและตั้งค่าบัญชีของคุณ" />

      <Card className="mb-5 py-0">
        <CardContent className="flex items-center gap-4 p-6">
          <Avatar className="size-16">
            <AvatarFallback className="text-xl">{initials(form.name || "นักศึกษา")}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="text-lg font-bold">{form.name || "นักศึกษา"}</div>
            <div className="truncate text-muted-foreground">{session.user?.email}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ข้อมูลส่วนตัว</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <FormField label="ชื่อ-นามสกุล" htmlFor="profile-name">
            <Input id="profile-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </FormField>
          <FormField label="รหัสนักศึกษา" htmlFor="profile-student-no">
            <Input id="profile-student-no" value={form.student_no} onChange={(e) => setForm({ ...form, student_no: e.target.value })} />
          </FormField>
          <FormField label="อีเมล" htmlFor="profile-email" description="ไม่สามารถเปลี่ยนอีเมลได้ เนื่องจากล็อกอินผ่าน Google">
            <Input id="profile-email" value={session.user?.email ?? ""} disabled />
          </FormField>
          <div className="flex justify-end">
            <Button onClick={saveProfile} disabled={saving}>
              {saving ? <Spinner /> : <CheckIcon />}
              {saving ? "กำลังบันทึก..." : "บันทึกการเปลี่ยนแปลง"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
