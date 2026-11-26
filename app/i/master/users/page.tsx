"use client";

import { useEffect, useMemo, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { toast } from "sonner";
import { FileSpreadsheetIcon, LockIcon, PlusIcon } from "lucide-react";
import type { Database } from "@/lib/database.types";
import { supabase } from "@/lib/supabase";
import { DEFAULT_DOMAIN } from "@/lib/course-access";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";
import { PageContainer } from "@/components/common/page-container";
import { PageHeader } from "@/components/common/page-header";
import { DataTable } from "@/components/common/data-table";
import { EmptyState, LoadingState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { useConfirmDelete } from "@/components/master/list-page";
import { userColumns } from "@/components/master/users/columns";
import { ImportUsersDialog } from "@/components/master/users/import-dialog";
import { BulkSectionBar, UserFilters } from "@/components/master/users/toolbar";
import {
  UserDialog,
  type RoleSummary,
  type SectionSummary,
  type SubjectGroupRow,
  type UserItem,
  type UserSaveInput,
} from "@/components/master/users/user-dialog";

type StudentGradeRow = Database["public"]["Tables"]["student_grades"]["Row"];
type SubjectGroupManagerRow = Database["public"]["Tables"]["subject_group_managers"]["Row"];

type UserDialogState =
  | { mode: "add"; row?: undefined }
  | { mode: "edit"; row: UserItem };

const HEADER = {
  kicker: "ระบบหลังบ้าน · ข้อมูลหลัก (Master Data)",
  title: "จัดการผู้ใช้งาน",
};

export default function MasterUsersPage() {
  const { data: session, status: sessionStatus } = useSession();
  const canManageUsers = hasPermission(session?.user, PERMISSIONS.USERS_MANAGE);
  const canImpersonate = hasPermission(session?.user, PERMISSIONS.USERS_IMPERSONATE);
  const [usersList, setUsersList] = useState<UserItem[]>([]);
  const [gradesList, setGradesList] = useState<StudentGradeRow[]>([]);
  const [rolesList, setRolesList] = useState<RoleSummary[]>([]);
  const [sectionsList, setSectionsList] = useState<SectionSummary[]>([]);
  const [subjectGroups, setSubjectGroups] = useState<SubjectGroupRow[]>([]);
  const [groupManagers, setGroupManagers] = useState<SubjectGroupManagerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [dlg, setDlg] = useState<UserDialogState | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [filterRole, setFilterRole] = useState("all");
  const [filterGrade, setFilterGrade] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [bulkSection, setBulkSection] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const confirmDelete = useConfirmDelete();

  useEffect(() => {
    if (sessionStatus === "loading" || !canManageUsers) return;
    const load = async () => {
      const [uRes, gRes, rRes, sgRes, sgmRes, secRes] = await Promise.all([
        supabase.from("users").select("*"),
        supabase.from("student_grades").select("*").eq("domain", DEFAULT_DOMAIN),
        supabase.from("roles").select("id, name"),
        supabase.from("subject_groups").select("*").eq("status", "active"),
        supabase.from("subject_group_managers").select("*"),
        supabase.from("sections").select("id, name").order("name"),
      ]);

      if (rRes.data) setRolesList(rRes.data);
      if (secRes.data) setSectionsList(secRes.data);
      if (gRes.data) setGradesList(gRes.data);
      if (sgRes.data) setSubjectGroups(sgRes.data);
      if (sgmRes.data) setGroupManagers(sgmRes.data);
      if (uRes.data) {
        setUsersList(uRes.data.map((u) => ({
          ...u,
          studentId: u.student_no,
          sec: u.section,
          status: "active",
        })));
      }
      setLoading(false);
    };
    load();
  }, [sessionStatus, canManageUsers, reloadKey]);

  const handleSaveUser = async (updatedUser: UserSaveInput) => {
    if (!dlg) return;
    const currentDlg = dlg;
    setDlg(null);
    const dbUser = {
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      student_no: updatedUser.role === "student" ? updatedUser.studentId : updatedUser.studentId || "อาจารย์ผู้สอน",
      section: updatedUser.role === "student" ? updatedUser.sec : "ไม่มี",
      group_id: updatedUser.groupId || null,
    };

    if (currentDlg.mode === "add") {
      const newId = "u_" + Date.now();
      const { error } = await supabase.from("users").insert([{ id: newId, ...dbUser }]);
      if (error) {
        toast.error("เกิดข้อผิดพลาดในการเพิ่มผู้ใช้: " + error.message);
      } else {
        setUsersList((prev) => [...prev, { id: newId, ...dbUser, studentId: dbUser.student_no, sec: dbUser.section, group_id: dbUser.group_id, status: updatedUser.status }]);
        toast.success("เพิ่มผู้ใช้งานเรียบร้อยแล้ว");
      }
    } else {
      const { error } = await supabase.from("users").update(dbUser).eq("id", currentDlg.row.id);
      if (error) {
        toast.error("เกิดข้อผิดพลาดในการแก้ไขผู้ใช้: " + error.message);
      } else {
        setUsersList((prev) => prev.map((u) => (u.id === currentDlg.row.id ? { ...u, ...dbUser, studentId: dbUser.student_no, sec: dbUser.section, group_id: dbUser.group_id, status: updatedUser.status } : u)));
        toast.success("บันทึกการแก้ไขเรียบร้อยแล้ว");
      }
    }
  };

  const handleImpersonate = async (user: UserItem) => {
    toast("กำลังเตรียมสลับหน้าสวมบทบาท...");

    if (session?.user?.id && session?.user?.name) {
      if (!localStorage.getItem("original_admin_id")) {
        localStorage.setItem("original_admin_id", session.user.id);
        localStorage.setItem("original_admin_name", session.user.name);
      }
    }

    const userRoles = user.role ? user.role.split(",").map((r) => r.trim()) : [];
    const isStaff = userRoles.includes("admin") || userRoles.includes("course_manager") || userRoles.includes("instructor");
    const callbackUrl = isStaff ? "/i/courses" : "/s/courses";

    const result = await signIn("credentials", {
      userId: user.id,
      callbackUrl,
      redirect: false,
    });

    if (result?.error) {
      toast.error("เกิดข้อผิดพลาดในการสวมบทบาท: " + result.error);
    } else {
      toast.success(`สวมบทบาทเป็น ${user.name} สำเร็จ! กำลังเปลี่ยนหน้า...`);
      setTimeout(() => {
        window.location.href = callbackUrl;
      }, 800);
    }
  };

  const handleDeleteUser = async (user: UserItem) => {
    if (!(await confirmDelete("ลบผู้ใช้งาน", `ต้องการลบ "${user.name}" ออกจากระบบ?`))) return;
    const { error } = await supabase.from("users").delete().eq("id", user.id);
    if (error) {
      toast.error("เกิดข้อผิดพลาดในการลบผู้ใช้งาน: " + error.message);
    } else {
      setUsersList((prev) => prev.filter((u) => u.id !== user.id));
      setSelectedIds((prev) => {
        if (!prev.has(user.id)) return prev;
        const next = new Set(prev);
        next.delete(user.id);
        return next;
      });
      toast.success("ลบผู้ใช้งานเรียบร้อยแล้ว");
    }
  };

  // Role + grade filters; the search box is handled by the table.
  const filteredUsers = useMemo(() => {
    return usersList.filter((u) => {
      if (filterRole !== "all") {
        const roles = u.role ? u.role.split(",").map((r) => r.trim()) : [];
        if (!roles.includes(filterRole)) return false;
      }
      if (filterGrade !== "all") {
        const roles = u.role ? u.role.split(",").map((r) => r.trim()) : [];
        if (!roles.includes("student") || !u.studentId) return false;
        const prefix = String(u.studentId).slice(0, 2);
        const gradeMapping = gradesList.find((g) => g.prefix === prefix);
        if (!gradeMapping || gradeMapping.year_label !== filterGrade) return false;
      }
      return true;
    });
  }, [usersList, filterRole, filterGrade, gradesList]);

  const gradeLabels = useMemo(() => Array.from(new Set(gradesList.map((g) => g.year_label))).sort(), [gradesList]);

  const toggleSelectAll = (ids: string[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (ids.length > 0 && ids.every((id) => prev.has(id))) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkAssignSection = async () => {
    if (!bulkSection || selectedIds.size === 0 || bulkSaving) return;
    setBulkSaving(true);
    const ids = Array.from(selectedIds);
    const { error } = await supabase
      .from("users")
      .update({ section: bulkSection })
      .in("id", ids);
    setBulkSaving(false);

    if (error) {
      toast.error("เกิดข้อผิดพลาดในการกำหนด Section: " + error.message);
      return;
    }

    setUsersList((prev) =>
      prev.map((u) => (selectedIds.has(u.id) ? { ...u, section: bulkSection, sec: bulkSection } : u))
    );
    setSelectedIds(new Set());
    setBulkSection("");
    toast.success(`กำหนด Section "${bulkSection}" ให้ผู้ใช้ ${ids.length} คนเรียบร้อยแล้ว`);
  };

  const columns = useMemo(
    () =>
      userColumns({
        rolesList,
        subjectGroups,
        groupManagers,
        gradesList,
        selectedIds,
        onToggleOne: toggleSelectOne,
        onToggleAll: toggleSelectAll,
        canImpersonate,
        onImpersonate: handleImpersonate,
        onEdit: (row) => setDlg({ mode: "edit", row }),
        onDelete: handleDeleteUser,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handlers only touch state setters, the supabase client and `session`
    [rolesList, subjectGroups, groupManagers, gradesList, selectedIds, canImpersonate, session],
  );

  if (sessionStatus === "loading") {
    return (
      <PageContainer>
        <LoadingState />
      </PageContainer>
    );
  }

  if (!canManageUsers) {
    return (
      <PageContainer>
        <PageHeader {...HEADER} />
        <EmptyState icon={<LockIcon />} title="ไม่มีสิทธิ์เข้าถึงหน้านี้" />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        {...HEADER}
        description="จัดการบัญชีผู้ใช้ในระบบ สิทธิ์บทบาทหน้าที่ และข้อมูลกลุ่มเรียนของนักศึกษา"
        actions={
          <>
            <Button variant="outline" onClick={() => setImportOpen(true)} disabled={loading}>
              <FileSpreadsheetIcon />
              นำเข้าจาก Excel
            </Button>
            <Button onClick={() => setDlg({ mode: "add" })}>
              <PlusIcon />
              เพิ่มผู้ใช้
            </Button>
          </>
        }
      />
      <p className="mb-3 text-sm text-muted-foreground">จัดการข้อมูลผู้สอน นักศึกษา และสิทธิ์การใช้งานระบบ</p>

      {selectedIds.size > 0 && (
        <BulkSectionBar
          count={selectedIds.size}
          sectionsList={sectionsList}
          section={bulkSection}
          saving={bulkSaving}
          onSectionChange={setBulkSection}
          onClear={() => setSelectedIds(new Set())}
          onAssign={handleBulkAssignSection}
        />
      )}

      <DataTable.Root data={filteredUsers} columns={columns} getRowId={(r: UserItem) => r.id} searchKeys={["name", "email", "studentId"]}>
        <DataTable.Toolbar>
          <DataTable.Search placeholder="ค้นหาชื่อ, อีเมล หรือรหัส..." />
          <UserFilters
            rolesList={rolesList}
            gradeLabels={gradeLabels}
            filterRole={filterRole}
            filterGrade={filterGrade}
            onRoleChange={(role) => {
              setFilterRole(role);
              if (role !== "all" && role !== "student") setFilterGrade("all");
            }}
            onGradeChange={setFilterGrade}
          />
        </DataTable.Toolbar>
        <DataTable.Content loading={loading} empty={<EmptyState title="ยังไม่มีผู้ใช้งาน" />} />
        <DataTable.Pagination />
      </DataTable.Root>

      {dlg && <UserDialog mode={dlg.mode} row={dlg.row} rolesList={rolesList} subjectGroups={subjectGroups} onClose={() => setDlg(null)} onSave={handleSaveUser} />}
      {importOpen && (
        <ImportUsersDialog
          rolesList={rolesList}
          sectionsList={sectionsList}
          existingUsers={usersList}
          onClose={() => setImportOpen(false)}
          onImported={() => {
            setSelectedIds(new Set());
            setReloadKey((k) => k + 1);
          }}
        />
      )}
    </PageContainer>
  );
}
