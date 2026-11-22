"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { Database, Json } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";
import { useConfirm } from "@/components/common/confirm";
import { MasterListPage } from "@/components/master/list-page";
import { roleColumns, SYSTEM_ROLES } from "@/components/master/roles/columns";
import { RoleDialog, type RoleFormValues, type RoleItem } from "@/components/master/roles/role-dialog";

type RoleRow = Database["public"]["Tables"]["roles"]["Row"];

type RoleDialogState =
  | { mode: "add"; row: null }
  | { mode: "edit"; row: RoleItem };

function parsePermissions(raw: Json | null): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((item): item is string => typeof item === "string");
}

function toRoleItem(row: RoleRow): RoleItem {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    permissions: parsePermissions(row.permissions),
    created_at: row.created_at,
  };
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    const msg = (err as { message: unknown }).message;
    return typeof msg === "string" ? msg : "";
  }
  return "";
}

export default function RolesPage() {
  const [data, setData] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<RoleDialogState | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((k) => k + 1);
  const confirm = useConfirm();

  useEffect(() => {
    const load = async () => {
      const { data: roles } = await supabase
        .from("roles")
        .select("*")
        .order("created_at", { ascending: true });

      if (roles) setData(roles.map(toRoleItem));
      setLoading(false);
    };
    load();
  }, [reloadKey]);

  const handleSave = async (roleData: RoleFormValues) => {
    if (!dialog) return;
    try {
      if (dialog.mode === "add") {
        const { error } = await supabase.from("roles").insert([roleData]);
        if (error) throw error;
        toast.success("สร้าง Role เรียบร้อยแล้ว");
      } else {
        const { error } = await supabase.from("roles")
          .update({
            name: roleData.name,
            description: roleData.description,
            permissions: roleData.permissions
          })
          .eq("id", roleData.id);
        if (error) throw error;
        toast.success("บันทึกการแก้ไขเรียบร้อยแล้ว");
      }
      setDialog(null);
      reload();
    } catch (error: unknown) {
      toast.error("เกิดข้อผิดพลาด: " + getErrorMessage(error));
    }
  };

  const handleDelete = async (row: RoleItem) => {
    if (SYSTEM_ROLES.includes(row.id)) {
      toast.error("ไม่สามารถลบ Role ระบบพื้นฐานได้");
      return;
    }

    if (!(await confirm({
      title: "ลบ Role",
      desc: `คุณต้องการลบ Role "${row.name}" ใช่หรือไม่? ผู้ใช้ที่มี Role นี้อาจได้รับผลกระทบ`,
      confirmText: "ลบข้อมูล",
      danger: true
    }))) {
      return;
    }

    try {
      const { error } = await supabase.from("roles").delete().eq("id", row.id);
      if (error) throw error;
      toast.success("ลบ Role เรียบร้อยแล้ว");
      reload();
    } catch {
      toast.error("ไม่สามารถลบได้ อาจมีการใช้งาน Role นี้อยู่");
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps -- handlers only touch state setters and the supabase client
  const columns = useMemo(() => roleColumns((row) => setDialog({ mode: "edit", row }), handleDelete), []);

  return (
    <MasterListPage
      title="จัดการสิทธิ์"
      description="กำหนด Role และสิทธิ์การเข้าถึงเมนูต่างๆ ในระบบ"
      note="กำหนด Role และสิทธิ์การเข้าถึงสำหรับผู้ใช้แต่ละประเภท"
      addLabel="เพิ่ม Role"
      onAdd={() => setDialog({ mode: "add", row: null })}
      data={data}
      columns={columns}
      loading={loading}
      searchKeys={["id", "name", "description"]}
      searchPlaceholder="ค้นหา Role…"
      emptyTitle="ยังไม่มี Role"
    >
      {dialog && <RoleDialog mode={dialog.mode} row={dialog.row} onClose={() => setDialog(null)} onSave={handleSave} />}
    </MasterListPage>
  );
}
