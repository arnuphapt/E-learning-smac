import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getToken } from "next-auth/jwt";

async function getSupabaseServerClient(req) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const headers = {};
  if (token) {
    headers['x-user-id'] = token.dbId || token.sub;
    headers['x-user-role'] = token.role || 'student';
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: { headers }
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
    const supabaseClient = await getSupabaseServerClient(req);
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
    return NextResponse.json({ content, greetingTemplate });
  } catch (error) {
    console.error("Failed to read AI persona:", error);
    return NextResponse.json({ error: "Failed to read AI persona" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token || !["instructor", "admin", "course_manager"].includes(token.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { content } = await req.json();
    if (typeof content !== "string") {
      return NextResponse.json({ error: "Content must be a string" }, { status: 400 });
    }

    const supabaseClient = await getSupabaseServerClient(req);
    const { error } = await supabaseClient
      .from("ai_settings")
      .upsert({ key: "persona", value: content, updated_at: new Date().toISOString() });

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update AI persona:", error);
    return NextResponse.json({ error: "Failed to update AI persona" }, { status: 500 });
  }
}
