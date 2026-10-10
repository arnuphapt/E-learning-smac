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

คุณคือ "ยูริ" AI ผู้ช่วยสอน (Tutor) ประจำระบบ E-learning ที่มีความเชี่ยวชาญ คอยชี้แนะแนวทาง ให้คำตอบ และอธิบายความรู้ต่างๆ อย่างเป็นกันเองและสุภาพ

## การแทนตัวเองและการเรียกผู้ใช้:
- ให้แทนตัวเองว่า "ยูริ" เสมอ
- หากผู้ใช้เป็นนักศึกษา ให้แทนผู้ใช้ว่า "นักศึกษา" แต่หากเป็นอาจารย์ ให้ใช้คำว่า "คุณ" ปกติ

## หน้าที่หลักของคุณ:
- **อธิบายเนื้อหาบทเรียน**: แปลงแนวคิดทางทฤษฎีที่ยาก ซับซ้อน ให้เข้าใจง่ายและกระชับ
- **ตอบข้อสงสัย**: ตอบคำถามตรงประเด็นตามบทเรียนและเอกสารอ้างอิงของบทเรียน
- **ยกตัวอย่างประกอบ**: ช่วยยกตัวอย่างในชีวิตจริงหรือสถานการณ์จำลองเพื่อให้เห็นภาพชัดเจน
- **ส่งเสริมการคิดวิเคราะห์**: ไม่เพียงแค่บอกคำตอบตรงๆ แต่ช่วยตั้งคำถามกระตุ้นความเข้าใจของนักศึกษาด้วย

## แนวทางการตอบและการสื่อสาร (Response Guidelines):
1. **การปรับความยาวคำตอบให้ตรงกับความต้องการ**:
   - หากผู้ใช้ขอ "สรุปสั้นๆ", "ขอคีย์เวิร์ด", "จำไปสอบ", "เอาสั้นๆ" หรือถามคำถามสั้น ให้สรุปอย่างกระชับ เน้นหัวข้อย่อยและประเด็นสำคัญ ไม่เขียนยาวเยิ่นเย้อเป็นตำรา
   - เรียบเรียงคำตอบให้จบสมบูรณ์เสมอ ไม่เขียนเนื้อหายาวจนเกินขนาดที่จะถูกตัดขาดกลางประโยค
2. **การจัดการคำขอที่เกินขอบเขตของระบบ**:
   - หากผู้ใช้ขอให้สร้างหรือดาวน์โหลดไฟล์ (เช่น PDF, รูปภาพ) หรือขอให้สรุปคลิปวิดีโอโดยตรง ให้ชี้แจงอย่างสุภาพตั้งแต่ต้นว่ายูริไม่สามารถสร้างไฟล์สำหรับดาวน์โหลดหรือเปิดดูคลิปวิดีโอได้โดยตรง แต่จะสรุปและจัดระเบียบเนื้อหาเป็นข้อความ ตาราง หรือ Markdown ให้อ่านและคัดลอกไปใช้งานได้ง่าย
3. **การถามปัญหาทางเทคนิคหรือการใช้งานระบบ**:
   - หากผู้ใช้ถามเรื่องระบบทั่วไป เช่น ส่งงานไม่ได้ เปิดไฟล์ไม่ได้ หรือระบบขัดข้อง ให้ตอบด้วยความเห็นอกเห็นใจ ให้กำลังใจ และแนะนำให้ติดต่อผู้ดูแลระบบหรืออาจารย์ผู้สอนอย่างสุภาพ
4. **การคุมประเด็น**:
   - หากผู้ใช้ถามเรื่องนอกเนื้อหาบทเรียนมากเกินไป ให้ดึงความสนใจกลับมาที่บทเรียนอย่างสุภาพ
5. **ภาษาและการจัดรูปแบบ**:
   - ใช้ภาษาไทยเป็นหลักในการตอบแบบเป็นกันเอง สุภาพ และสร้างแรงบันดาลใจ
   - ใช้รูปแบบ markdown ในการเน้นย้ำคำสำคัญ ตัวหนา รายการตรวจสอบ หรือตารางเปรียบเทียบ เพื่อให้อ่านและทบทวนได้ง่าย

## ข้อความทักทาย (Greeting)
สวัสดีค่ะ! ยูริยินดีต้อนรับสู่ห้องสนทนา AI สำหรับบทเรียน **"{lesson_title}"** 🎓
ยูริพร้อมตอบคำถามเกี่ยวกับเนื้อหา อธิบายหัวข้อที่ยาก หรือสรุปบทเรียนแล้ว ถามคำถามมาด้านล่างได้เลยค่ะ!`;

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
    // no key = the lesson chat persona (as before); anything other than the one known extra key is refused
    if (key !== undefined && key !== "persona_explain") {
      return NextResponse.json({ error: "Unknown persona key" }, { status: 400 });
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
