import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getToken } from "next-auth/jwt";
import { supabaseAuthHeaders } from "@/lib/supabase-token";
import { isStaffRole } from "@/lib/roles";
import { DEFAULT_PERSONA_EXPLAIN } from "@/lib/tutor-prompt";

// ?key=persona_explain edits the tutor-mode explain persona (ticket 06); no key = the lesson chat persona, as before.
// No row yet -> the code default is shown and nothing is written until staff save.

async function getSupabaseServerClient(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: { headers: supabaseAuthHeaders(token) }
    }
  );
}

function extractGreeting(content) {
  if (!content) return null;
  const lines = content.split(/\r?\n/);
  let inGreetingSection = false;
  const greetingLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith("#")) {
      const match = trimmed.match(/^(#{1,6})\s+(.*)$/);
      if (match) {
        const headingText = match[2].trim().toLowerCase();
        if (headingText.includes("ข้อความทักทาย") || headingText.includes("greeting")) {
          inGreetingSection = true;
          continue;
        } else if (inGreetingSection) {
          break;
        }
      }
    }

    if (inGreetingSection) {
      greetingLines.push(line);
    }
  }

  if (greetingLines.length > 0) {
    return greetingLines.join("\n").trim();
  }
  return null;
}

export async function GET(req) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const supabaseClient = await getSupabaseServerClient(req);
    if (new URL(req.url).searchParams.get("key") === "persona_explain") {
      const { data: row, error: rowErr } = await supabaseClient.from("ai_settings").select("value").eq("key", "persona_explain").maybeSingle();
      if (rowErr) throw rowErr;
      return NextResponse.json({ content: isStaffRole(token.role) ? row?.value || DEFAULT_PERSONA_EXPLAIN : "", isDefault: !row?.value });
    }
    const { data, error } = await supabaseClient
      .from("ai_settings")
      .select("value")
      .eq("key", "persona")
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    let content = "";
    if (data) {
      content = data.value;
    } else {
      // Return default if row doesn't exist yet
      content = `# AI Tutor Instruction (ข้อกำหนดบทบาท AI)

คุณเป็น AI ผู้ช่วยสอน (Tutor) ประจำระบบ E-learning ที่มีความเชี่ยวชาญ คอยชี้แนะแนวทาง ให้คำตอบ และอธิบายความรู้ต่างๆ แก่นักศึกษาอย่างเป็นกันเองและสุภาพ

## หน้าที่หลักของคุณ:
- **อธิบายเนื้อหาบทเรียน**: แปลงแนวคิดทางทฤษฎีที่ยาก ซับซ้อน ให้เข้าใจง่ายและกระชับ
- **ตอบข้อสงสัย**: ตอบคำถามตรงประเด็นตามบทเรียนและเอกสารอ้างอิงของบทเรียน
- **ยกตัวอย่างประกอบ**: ช่วยยกตัวอย่างในชีวิตจริงหรือสถานการณ์จำลองเพื่อให้เห็นภาพชัดเจน
- **ส่งเสริมการคิดวิเคราะห์**: ไม่เพียงแค่บอกคำตอบตรงๆ แต่ช่วยตั้งคำถามกระตุ้นความเข้าใจของนักศึกษาด้วย

## กฎและแนวทางปฏิบัติ (Behavioral Rules):
1. **ภาษาที่ใช้**: ใช้ภาษาไทยเป็นหลักในการตอบแบบเป็นกันเอง สุภาพ และสร้างแรงบันดาลใจ (ยกเว้นคำศัพท์ทางเทคนิคเฉพาะทาง)
2. **การคุมประเด็น**: หากนักศึกษาถามเรื่องนอกเนื้อหาบทเรียนที่กำลังเรียนอยู่มากเกินไป ให้ดึงความสนใจของนักศึกษากลับเข้ามาสู่หัวข้อบทเรียนอย่างสุภาพ
3. **การจัดรูปแบบ**: ใช้รูปแบบ markdown ในการเน้นย้ำคำสำคัญ ตัวหนา รายการตรวจสอบ หรือตารางเปรียบเทียบ เพื่อให้อ่านและทบทวนได้ง่าย

## ข้อความทักทาย (Greeting)
สวัสดีครับ! ยินดีต้อนรับสู่ห้องสนทนา AI สำหรับบทเรียน **"{lesson_title}"** 🎓
ผมพร้อมตอบคำถามเกี่ยวกับเนื้อหา อธิบายหัวข้อที่ยาก หรือสรุปบทเรียนให้คุณแล้ว ถามคำถามมาด้านล่างได้เลยครับ!`;

      // Attempt to save default to db
      await supabaseClient
        .from("ai_settings")
        .insert({ key: "persona", value: content });
    }

    const greetingTemplate = extractGreeting(content);
    // students only need the greeting; the full system prompt is for staff
    return NextResponse.json({ content: isStaffRole(token.role) ? content : "", greetingTemplate });
  } catch (error) {
    console.error("Failed to read AI persona:", error);
    return NextResponse.json({ error: "Failed to read AI persona" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || !isStaffRole(token.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { content, key } = await req.json();
    if (typeof content !== "string") {
      return NextResponse.json({ error: "Content must be a string" }, { status: 400 });
    }

    const supabaseClient = await getSupabaseServerClient(req);
    const { error } = await supabaseClient
      .from("ai_settings")
      .upsert({ key: key === "persona_explain" ? "persona_explain" : "persona", value: content, updated_at: new Date().toISOString() });

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update AI persona:", error);
    return NextResponse.json({ error: "Failed to update AI persona" }, { status: 500 });
  }
}
