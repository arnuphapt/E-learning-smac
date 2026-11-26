"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { MasterListPage, useConfirmDelete } from "@/components/master/list-page";
import { groupColumns, type GroupTableRow } from "@/components/master/groups/columns";
import {
  GroupDialog,
  type GroupSaveInput,
  type SubjectGroupItem,
  type SubjectGroupManagerRow,
} from "@/components/master/groups/group-dialog";
import type { UserRow } from "@/components/common/manager-select";

type GroupDialogState =
  | { mode: "add"; row?: undefined }
  | { mode: "edit"; row: SubjectGroupItem };

export default function MasterGroupsPage() {
  const [subjectGroups, setSubjectGroups] = useState<SubjectGroupItem[]>([]);
  const [instructors, setInstructors] = useState<UserRow[]>([]);
  const [groupManagers, setGroupManagers] = useState<SubjectGroupManagerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dlg, setDlg] = useState<GroupDialogState | null>(null);
  const confirmDelete = useConfirmDelete();

  const [reloadKey, setReloadKey] = useState(0);
  const loadData = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    const load = async () => {
      const [gRes, uRes, sgmRes, cRes] = await Promise.all([
        supabase.from("subject_groups").select("*"),
        supabase.from("users").select("*"),
        supabase.from("subject_group_managers").select("*"),
        supabase.from("courses").select("id, group_id")
      ]);
      if (!gRes.error) {
        const courses = cRes.data || [];
        const groups: SubjectGroupItem[] = (gRes.data || []).map((g) => ({
          ...g,
          courses: courses.filter((c) => c.group_id === g.id).length
        }));
        setSubjectGroups(groups);
      }
      if (!uRes.error) setInstructors(uRes.data || []);
      if (!sgmRes.error) setGroupManagers(sgmRes.data || []);
      setLoading(false);
    };
    load();
  }, [reloadKey]);

  const handleSaveGroup = async (updatedGroup: GroupSaveInput) => {
    if (!dlg) return;
    const currentDlg = dlg;
    setDlg(null);
    const { selectedManagers, ...groupFields } = updatedGroup;
    let groupId: string;

    if (currentDlg.mode === "add") {
      groupId = "g_" + Date.now();
      const obj: SubjectGroupItem = { id: groupId, ...groupFields };
      const { error } = await supabase.from("subject_groups").insert([obj]);
      if (error) {
        toast.error("เกิดข้อผิดพลาดในการสร้างกลุ่มวิชา: " + error.message);
        return;
      }
      setSubjectGroups((prev) => [...prev, obj]);
      toast.success("เพิ่มกลุ่มวิชาเรียบร้อยแล้ว");
    } else {
      groupId = currentDlg.row.id;
      const { error } = await supabase.from("subject_groups").update(groupFields).eq("id", groupId);
      if (error) {
        toast.error("เกิดข้อผิดพลาดในการแก้ไขกลุ่มวิชา: " + error.message);
        return;
      }
      setSubjectGroups((prev) => prev.map((g) => (g.id === groupId ? { ...g, ...groupFields } : g)));
      toast.success("บันทึกการแก้ไขเรียบร้อยแล้ว");
    }

    // Update managers in subject_group_managers
    await supabase.from("subject_group_managers").delete().eq("group_id", groupId);

    if (selectedManagers.length > 0) {
      const insertRows = selectedManagers.map((userId) => ({
        group_id: groupId,
        user_id: userId
      }));
      await supabase.from("subject_group_managers").insert(insertRows);
    }

    loadData();
  };

  const handleDeleteGroup = async (g: SubjectGroupItem) => {
    if (!(await confirmDelete("ลบกลุ่มวิชา", `คุณต้องการลบ "${g.name}" หรือไม่?`))) return;
    const { error } = await supabase.from("subject_groups").delete().eq("id", g.id);
    if (error) {
      toast.error("เกิดข้อผิดพลาดในการลบกลุ่มวิชา: " + error.message);
    } else {
      setSubjectGroups((prev) => prev.filter((r) => r.id !== g.id));
      toast.success("ลบกลุ่มวิชาเรียบร้อยแล้ว");
    }
  };

  const handleBulkDeleteGroups = async (rows: GroupTableRow[]) => {
    const ids = rows.map((r) => r.id);
    const { error } = await supabase.from("subject_groups").delete().in("id", ids);
    if (error) {
      toast.error("เกิดข้อผิดพลาดในการลบกลุ่มวิชา: " + error.message);
      return false;
    }
    setSubjectGroups((prev) => prev.filter((r) => !ids.includes(r.id)));
    toast.success(`ลบกลุ่มวิชา ${ids.length} รายการเรียบร้อยแล้ว`);
    return true;
  };

  const rows = useMemo<GroupTableRow[]>(
    () =>
      subjectGroups.map((g) => {
        const managers = groupManagers
          .filter((m) => m.group_id === g.id)
          .map((m) => instructors.find((u) => u.id === m.user_id))
          .filter((u): u is UserRow => Boolean(u));
        return { ...g, managers, managerNames: managers.map((m) => m.name).join(" ") };
      }),
    [subjectGroups, groupManagers, instructors],
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps -- handlers only touch state setters and the supabase client
  const columns = useMemo(() => groupColumns((row) => setDlg({ mode: "edit", row }), handleDeleteGroup), []);

  return (
    <MasterListPage
      title="กลุ่มวิชา"
      description="จัดการข้อมูลสาขาวิชาและคณาจารย์ผู้รับผิดชอบ"
      note="กลุ่มสาขาวิชาและหัวหน้ากลุ่มผู้รับผิดชอบ"
      addLabel="เพิ่มกลุ่มวิชา"
      onAdd={() => setDlg({ mode: "add" })}
      bulkDelete={{ noun: "กลุ่มวิชา", rowLabel: (r) => r.name || r.id, onDelete: handleBulkDeleteGroups }}
      data={rows}
      columns={columns}
      loading={loading}
      searchKeys={["name", "managerNames"]}
      searchPlaceholder="ค้นหากลุ่มวิชาหรืออาจารย์…"
      emptyTitle="ยังไม่มีกลุ่มวิชา"
    >
      {dlg && <GroupDialog mode={dlg.mode} row={dlg.row} instructors={instructors} groupManagers={groupManagers} onClose={() => setDlg(null)} onSave={handleSaveGroup} />}
    </MasterListPage>
  );
}
