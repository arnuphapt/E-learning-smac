"use client";

import { useState } from "react";
import { Loader2Icon, PlusIcon } from "lucide-react";
import { FormField } from "@/components/common/form-field";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

/** Dialog for creating a new live quiz by title; mount only while open. */
export function CreateQuizDialog({
  onClose,
  onCreate,
  loading,
}: {
  onClose: () => void;
  onCreate: (title: string) => Promise<void>;
  loading?: boolean;
}) {
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const trimmed = title.trim();
    if (!trimmed) {
      setError("กรุณากรอกชื่อชุดควิซ");
      return;
    }
    setError(null);
    await onCreate(trimmed);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !loading && onClose()}>
      <DialogContent>
        <form noValidate className="grid gap-4" onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>สร้างชุดควิซ</DialogTitle>
            <DialogDescription>ตั้งชื่อชุดควิซใหม่ จากนั้นระบบจะพาไปยังหน้าแก้ไขคำถาม</DialogDescription>
          </DialogHeader>
          <FormField label="ชื่อชุดควิซ" htmlFor="live-quiz-title" required error={error}>
            <Input
              id="live-quiz-title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError(null);
              }}
              placeholder="เช่น แบบทดสอบทบทวนบทที่ 1"
              autoFocus
              disabled={loading}
            />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              ยกเลิก
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2Icon className="animate-spin" /> : <PlusIcon />}
              สร้างชุดควิซ
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
