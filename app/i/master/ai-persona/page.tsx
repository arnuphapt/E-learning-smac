"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { hasPermission, PERMISSIONS } from "@/lib/rbac";
import { PageContainer } from "@/components/common/page-container";
import { PageHeader } from "@/components/common/page-header";
import { LoadingState } from "@/components/common/states";
import { ConfigCard, isPresetModel, type ConfigDraft, type ConfigKey } from "@/components/master/ai-persona/config-card";
import { PersonaEditor } from "@/components/master/ai-persona/persona-editor";
import { ProfileCard, type AiStatus } from "@/components/master/ai-persona/profile-card";

interface HealthResponse {
  status: AiStatus;
  reason?: string;
}

interface PersonaResponse {
  content: string;
}

type ConfigResponse = Partial<Record<ConfigKey, string | number>>;

export default function AiPersonaPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const allowed = status === "authenticated" && hasPermission(session?.user, PERMISSIONS.MASTER_MANAGE);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiStatus, setAiStatus] = useState<AiStatus>("checking");
  const [aiStatusReason, setAiStatusReason] = useState("");
  const [healthKey, setHealthKey] = useState(0);

  // Token & Model config states
  const [configDraft, setConfigDraft] = useState<ConfigDraft>({
    model: "gemini-3.8-flash",
    daily_chat_limit: "15",
    session_token_limit: "20000",
    max_output_tokens: "2048",
    max_output_tokens_with_files: "4096",
  });
  const [isCustomModel, setIsCustomModel] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!allowed) router.replace("/i/courses");
  }, [status, allowed, router]);

  useEffect(() => {
    if (!allowed) return;
    const load = async () => {
      try {
        const [personaRes, configRes] = await Promise.all([
          fetch("/api/ai/persona"),
          fetch("/api/ai/config"),
        ]);
        if (personaRes.ok) {
          const data = (await personaRes.json()) as PersonaResponse;
          setContent(data.content);
        } else {
          toast.error("เกิดข้อผิดพลาดในการโหลดข้อมูล Persona");
        }
        if (configRes.ok) {
          const cfg = (await configRes.json()) as ConfigResponse;
          const currentModel = String(cfg.model || "gemini-3.8-flash");
          setIsCustomModel(!isPresetModel(currentModel));
          setConfigDraft({
            model: currentModel,
            daily_chat_limit: String(cfg.daily_chat_limit ?? "15"),
            session_token_limit: String(cfg.session_token_limit ?? "50000"),
            max_output_tokens: String(cfg.max_output_tokens ?? "4096"),
            max_output_tokens_with_files: String(cfg.max_output_tokens_with_files ?? "8192"),
          });
        }
      } catch (e) {
        console.error(e);
        toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [allowed]);

  useEffect(() => {
    if (!allowed) return;
    const check = async () => {
      try {
        const res = await fetch("/api/ai/health");
        if (res.ok) {
          const data = (await res.json()) as HealthResponse;
          setAiStatus(data.status);
          setAiStatusReason(data.reason || "");
        } else {
          setAiStatus("offline");
          setAiStatusReason("HTTP request failed");
        }
      } catch (e: unknown) {
        setAiStatus("offline");
        setAiStatusReason(e instanceof Error ? e.message : String(e));
      }
    };
    check();
  }, [allowed, healthKey]);

  const recheckHealth = () => {
    setAiStatus("checking");
    setHealthKey((k) => k + 1);
  };

  const setConfig = (key: ConfigKey, val: string) => {
    // model is free text; every other field allows only positive integers
    setConfigDraft((prev) => ({ ...prev, [key]: key === "model" ? val : val.replace(/[^0-9]/g, "") }));
  };

  const handleSaveConfig = async () => {
    setConfigSaving(true);
    try {
      const res = await fetch("/api/ai/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configDraft),
      });
      if (res.ok) {
        toast.success("บันทึกการตั้งค่าโมเดลและโควต้าสำเร็จ");
      } else {
        toast.error("บันทึกการตั้งค่าล้มเหลว");
      }
    } catch (e) {
      console.error(e);
      toast.error("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setConfigSaving(false);
    }
  };

  const handleSavePersona = async (draft: string): Promise<boolean> => {
    setSaving(true);
    try {
      const res = await fetch("/api/ai/persona", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draft }),
      });
      if (res.ok) {
        setContent(draft);
        toast.success("บันทึกข้อกำหนดบทบาท AI สำเร็จแล้ว");
        return true;
      }
      toast.error("บันทึกข้อมูลล้มเหลว");
    } catch (e) {
      console.error(e);
      toast.error("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setSaving(false);
    }
    return false;
  };

  if (loading || status === "loading") {
    return (
      <PageContainer>
        <LoadingState />
      </PageContainer>
    );
  }

  return (
    <PageContainer className="max-w-[1600px]">
      <PageHeader kicker="ตั้งค่าระบบการเรียนรู้" title="กำหนดพฤติกรรม & Persona ของ AI" />

      <div className="flex flex-col items-start gap-6 lg:flex-row">
        <ProfileCard model={configDraft.model} status={aiStatus} reason={aiStatusReason} onRecheck={recheckHealth} />
        <PersonaEditor content={content} saving={saving} onSave={handleSavePersona} />
      </div>

      <ConfigCard
        draft={configDraft}
        isCustomModel={isCustomModel}
        saving={configSaving}
        onChange={setConfig}
        onCustomModelChange={setIsCustomModel}
        onSave={handleSaveConfig}
      />
    </PageContainer>
  );
}
