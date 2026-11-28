"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface HubItem {
  id: string;
  host_id: string;
  name: string;
  year_level: number[];
  room_count: number;
  member_count?: number;
  created_at: string;
  updated_at: string;
}

const YEAR_OPTIONS = [1, 2, 3, 4, 5, 6] as const;

export function formatHubYearLevels(yearLevel: number[]): string {
  if (!yearLevel || yearLevel.length === 0) return "ทุกชั้นปี";
  return [...yearLevel]
    .sort((a, b) => a - b)
    .map((y) => `ปี ${y}`)
    .join(", ");
}

export function HubFormDialog({
  open,
  onOpenChange,
  hub,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hub: HubItem | null;
  onSaved: (saved: HubItem, isEdit: boolean) => void;
}) {
  const [name, setName] = useState(() => hub?.name ?? "");
  const [years, setYears] = useState<number[]>(() => hub?.year_level ?? []);
  const [saving, setSaving] = useState(false);

  function toggleYear(year: number, checked: boolean) {
    setYears((prev) => {
      if (checked) {
        return prev.includes(year) ? prev : [...prev, year].sort((a, b) => a - b);
      }
      return prev.filter((y) => y !== year);
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("กรุณากรอกชื่อ hub");
      return;
    }

    setSaving(true);
    try {
      const isEdit = Boolean(hub);
      const url = isEdit ? `/api/live/hubs/${hub!.id}` : "/api/live/hubs";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed, year_level: years }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error || "ไม่สามารถบันทึก hub ได้");
        return;
      }

      const savedItem: HubItem = {
        ...data,
        room_count: typeof data.room_count === "number" ? data.room_count : (hub?.room_count ?? 0),
        member_count: typeof data.member_count === "number" ? data.member_count : (hub?.member_count ?? 0),
      };
      onSaved(savedItem, isEdit);
      onOpenChange(false);
      toast.success(isEdit ? "บันทึกการแก้ไข hub แล้ว" : "สร้าง hub ใหม่แล้ว");
    } catch {
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{hub ? "แก้ไข Hub" : "สร้าง Hub ใหม่"}</DialogTitle>
            <DialogDescription>
              กำหนดชื่อ hub และชั้นปีที่อนุญาตให้เข้าเล่นห้องควิซใน hub นี้
            </DialogDescription>
          </DialogHeader>

          <div className="my-4 flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="hub-name">ชื่อ Hub</Label>
              <Input
                id="hub-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="เช่น พยาบาลศาสตร์ ปี 2"
                maxLength={120}
                disabled={saving}
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label>ชั้นปี (ไม่เลือก = ทุกชั้นปี)</Label>
              <div className="grid grid-cols-3 gap-2 pt-1">
                {YEAR_OPTIONS.map((year) => {
                  const checked = years.includes(year);
                  const id = `hub-year-${year}`;
                  return (
                    <Label
                      key={year}
                      htmlFor={id}
                      className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm font-normal"
                    >
                      <Checkbox
                        id={id}
                        checked={checked}
                        onCheckedChange={(val) => toggleYear(year, val === true)}
                        disabled={saving}
                      />
                      <span>ปี {year}</span>
                    </Label>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "กำลังบันทึก..." : hub ? "บันทึก" : "สร้าง Hub"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
