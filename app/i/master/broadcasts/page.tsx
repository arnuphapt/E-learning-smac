"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import type { Database } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";
import { DEFAULT_DOMAIN } from "@/lib/course-access";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";
import { useConfirm } from "@/components/common/confirm";
import { MasterListPage } from "@/components/master/list-page";
import { broadcastColumns } from "@/components/master/broadcasts/columns";
import { BroadcastDialog, type BroadcastFormValues, type BroadcastRow } from "@/components/master/broadcasts/broadcast-dialog";

type BroadcastUpdate = Database["public"]["Tables"]["broadcasts"]["Update"];

type DialogState =
  | { mode: "add"; row?: undefined }
  | { mode: "edit"; row: BroadcastRow };

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    const msg = (err as { message: unknown }).message;
    return typeof msg === "string" ? msg : "";
  }
  return "";
}

export default function BroadcastsPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<BroadcastRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [masterYearLabels, setMasterYearLabels] = useState<string[]>([]);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((k) => k + 1);
  const confirm = useConfirm();

  const canManage = hasPermission(session?.user, PERMISSIONS.BROADCASTS_MANAGE);

  useEffect(() => {
    const load = async () => {
      const [bRes, sgRes] = await Promise.all([
        supabase
          .from("broadcasts")
          .select("*")
          .order("pinned", { ascending: false })
          .order("created_at", { ascending: false }),
        supabase.from("student_grades").select("prefix, year_label").eq("domain", DEFAULT_DOMAIN),
      ]);

      setData(bRes.data || []);

      if (sgRes?.data) {
        const uniqueYears = Array.from(
          new Set(sgRes.data.map((g) => g.year_label).filter((y): y is string => Boolean(y)))
        ).sort();
        setMasterYearLabels(uniqueYears);
      }

      setLoading(false);
    };
    load();
  }, [reloadKey]);

  const handleSave = async (values: BroadcastFormValues) => {
    if (!dialog) return;
    try {
      if (dialog.mode === "add") {
        const { error } = await supabase.from("broadcasts").insert([{
          id: "b_" + Date.now(),
          ...values,
          created_by: session?.user?.id,
        }]);
        if (error) throw error;
        toast.success("สร้างประกาศเรียบร้อยแล้ว");
      } else {
        const { error } = await supabase.from("broadcasts").update(values).eq("id", dialog.row.id);
        if (error) throw error;
        toast.success("บันทึกการแก้ไขเรียบร้อยแล้ว");
      }
      setDialog(null);
      reload();
    } catch (e: unknown) {
      toast.error("เกิดข้อผิดพลาด: " + getErrorMessage(e));
    }
  };

  const handleDelete = async (row: BroadcastRow) => {
    if (!(await confirm({
      title: "ลบประกาศ",
      message: `ลบประกาศ"${row.title}" ใช่หรือไม่?`,
      confirmText: "ลบ",
      danger: true,
    }))) return;
    const { error } = await supabase.from("broadcasts").delete().eq("id", row.id);
    if (error) { toast.error("ลบไม่สำเร็จ: " + error.message); return; }
    toast.success("ลบประกาศเรียบร้อยแล้ว");
    reload();
  };

  const handleBulkDelete = async (rows: BroadcastRow[]) => {
    const { error } = await supabase.from("broadcasts").delete().in("id", rows.map((r) => r.id));
    if (error) { toast.error("ลบไม่สำเร็จ: " + error.message); return false; }
    toast.success(`ลบประกาศ ${rows.length} รายการเรียบร้อยแล้ว`);
    reload();
    return true;
  };

  const handleResend = async (row: BroadcastRow) => {
    if (!(await confirm({
      title: "ส่งประกาศซ้ำ",
      message: `คุณต้องการส่งประกาศ"${row.title}" ซ้ำอีกครั้งใช่หรือไม่? การส่งซ้ำจะอัปเดตเวลาการประกาศเป็นปัจจุบันเพื่อส่งแจ้งเตือนไปยังนักศึกษาอีกครั้ง`,
      confirmText: "ส่งซ้ำ",
      cancelText: "ยกเลิก",
    }))) return;

    try {
      const now = new Date().toISOString();
      const updatedValues: BroadcastUpdate = { created_at: now };

      if (row.expires_at && new Date(row.expires_at) < new Date()) {
        updatedValues.expires_at = null;
      }

      const { error } = await supabase
        .from("broadcasts")
        .update(updatedValues)
        .eq("id", row.id);

      if (error) throw error;
      toast.success("ส่งประกาศซ้ำเรียบร้อยแล้ว");
      reload();
    } catch (e: unknown) {
      toast.error("เกิดข้อผิดพลาดในการส่งซ้ำ: " + getErrorMessage(e));
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps -- handlers only touch state setters, confirm and the supabase client
  const columns = useMemo(() => broadcastColumns(canManage, (row) => setDialog({ mode: "edit", row }), handleDelete, handleResend), [canManage]);

  return (
    <MasterListPage
      title="ประกาศ"
      description="สร้างและจัดการประกาศที่แสดงในหน้าของนักศึกษา"
      note="ประกาศจะแสดงในปุ่มแมวที่มุมขวาล่างของนักศึกษา"
      addLabel="สร้างประกาศ"
      onAdd={canManage ? () => setDialog({ mode: "add" }) : undefined}
      bulkDelete={canManage ? { noun: "ประกาศ", rowLabel: (r) => r.title, onDelete: handleBulkDelete } : undefined}
      data={data}
      columns={columns}
      loading={loading}
      searchKeys={["title", "body"]}
      searchPlaceholder="ค้นหาประกาศ…"
      emptyTitle="ยังไม่มีประกาศ"
    >
      {dialog && (
        <BroadcastDialog
          mode={dialog.mode}
          row={dialog.row}
          masterYearLabels={masterYearLabels}
          onClose={() => setDialog(null)}
          onSave={handleSave}
        />
      )}
    </MasterListPage>
  );
}
