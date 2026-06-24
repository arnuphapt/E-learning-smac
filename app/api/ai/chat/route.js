import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import fs from "fs";
import path from "path";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function fileToGenerativePart(url, mimeType) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch file from ${url}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    return {
      inlineData: {
        data: base64,
        mimeType: mimeType
      }
    };
  } catch (error) {
    console.error("Error converting file to generative part:", error);
    return null;
  }
}

function getMimeType(fileName) {
  const ext = fileName.split(".").pop().toLowerCase();
  switch (ext) {
    case "pdf": return "application/pdf";
    case "jpg":
    case "jpeg": return "image/jpeg";
    case "png": return "image/png";
    case "webp": return "image/webp";
    case "txt": return "text/plain";
    case "csv": return "text/csv";
    case "html": return "text/html";
    case "md": return "text/markdown";
    case "json": return "application/json";
    default: return null;
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { messages, lessonContext, mode, studentId, attachments } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "messages array is required" }, { status: 400 });
    }

    // Fetch AI-only documents from lessons table
    let aiDocs = [];
    if (lessonContext?.id) {
      const { data: dbLesson } = await supabase
        .from("lessons")
        .select("ai_documents")
        .eq("id", lessonContext.id)
        .single();
      if (dbLesson && Array.isArray(dbLesson.ai_documents)) {
        aiDocs = dbLesson.ai_documents;
      }
    }

    // Model is configured directly inside the chat initialization below

    // Build system context about the lesson
    let lessonInfo = lessonContext
      ? `
ข้อมูลบทเรียนที่นักศึกษากำลังเรียนอยู่:
- ชื่อบทเรียน: ${lessonContext.title || "ไม่ระบุ"}
- บทที่: ${lessonContext.index || "ไม่ระบุ"}
- รายวิชา: ${lessonContext.courseCode || ""} ${lessonContext.courseName || ""}
- คำอธิบายบทเรียน: ${lessonContext.description || "ไม่มีคำอธิบาย"}
- ระยะเวลาบทเรียน: ${lessonContext.duration || "ไม่ระบุ"}
`
      : "";

    if (aiDocs && aiDocs.length > 0) {
      lessonInfo += `\n- เอกสารอ้างอิงของบทเรียนนี้สำหรับระบบ AI (นักศึกษาจะไม่เห็นเนื้อหาหรือไฟล์โดยตรง): ${aiDocs.map((d) => d.name).join(", ")}`;
    }

    let customPersona = "";
    try {
      const filePath = path.join(process.cwd(), "ai_persona.md");
      if (fs.existsSync(filePath)) {
        customPersona = fs.readFileSync(filePath, "utf8");
      }
    } catch (e) {
      console.error("Failed to read ai_persona.md:", e);
    }

    const baseSystemPrompt = mode === "summarize"
      ? `คุณเป็น AI ผู้ช่วยสรุปเนื้อหาบทเรียนสำหรับระบบ E-learning
${lessonInfo}
กรุณาสรุปเนื้อหาและจุดสำคัญของบทเรียนนี้ให้กระชับและเข้าใจง่าย โดยอ้างอิงจากคำอธิบายและเอกสารอ้างอิงที่ให้มา
ตอบเป็นภาษาไทย จัดระเบียบด้วย bullet points และ headings ให้สวยงาม
หากไม่มีข้อมูลเพียงพอ ให้บอกว่าต้องการข้อมูลเพิ่มเติมอะไรบ้าง`
      : `${customPersona || `คุณเป็น AI ผู้ช่วยสอน (Tutor) สำหรับระบบ E-learning ที่คอยให้คำตอบและความรู้แก่นักศึกษา
หน้าที่ของคุณ:
1. ตอบคำถามที่เกี่ยวข้องกับเนื้อหาบทเรียน รวมถึงเอกสารของระบบ AI ที่แนบมาเป็นบริบทอ้างอิง และเอกสารที่นักศึกษาแนบมาเพิ่มเติม (หากมี)
2. อธิบายแนวคิดที่ยากให้เข้าใจง่ายขึ้น
3. ยกตัวอย่างประกอบการอธิบาย
4. ส่งเสริมการเรียนรู้เชิงรุก

กฎ:
- ตอบเป็นภาษาไทยเป็นหลัก (ยกเว้นคำศัพท์เทคนิค)
- หากถามนอกเรื่องบทเรียนหรือเอกสารแนบมาก ให้แนะนำให้กลับมาโฟกัสที่บทเรียน
- ตอบกระชับชัดเจน ไม่ยาวเกินไป
- ใช้ markdown เพื่อจัดรูปแบบเมื่อเหมาะสม`}`;

    const emotionInstruction = `
[CRITICAL INSTRUCTION FOR EMOTION CLASSIFICATION]
You must classify the nature of the student's input and append exactly one of the following tags to the very end of your response:
- If the student has answered your question/quiz/exercise correctly: Append "[emotion: impressive]"
- If the student asked something off-topic (ถามนอกเรื่อง), inappropriate, or completely unrelated to the lesson/course content: Append "[emotion: mad]"
- If you are providing a normal helpful answer, explanation, or summary of the lesson: Append "[emotion: smile]"
- For other neutral states: Append "[emotion: idle]"

Only append the tag at the end of the text. Do not output anything else about emotion.`;

    const systemPrompt = `${baseSystemPrompt}

${lessonInfo}

${emotionInstruction}`;

    // Build chat history for multi-turn
    const history = messages.slice(0, -1).map((m) => {
      let textContent = m.content;
      if (m.attachments && m.attachments.length > 0) {
        textContent += `\n\n[ไฟล์แนบ: ${m.attachments.map((f) => f.name).join(", ")}]`;
      }
      return {
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: textContent }],
      };
    });

    const lastMessage = messages[messages.length - 1];
    const userMessage = mode === "summarize"
      ? "กรุณาสรุปเนื้อหาบทเรียนนี้ให้หน่อยครับ/ค่ะ"
      : lastMessage.content;

    // Process current attachments
    const messageParts = [];
    const attachedFileNames = [];
    const unsupportedFileNames = [];

    // 1. Process AI-only documents (automatically attached as reference context)
    if (aiDocs && aiDocs.length > 0) {
      for (const file of aiDocs) {
        const mimeType = getMimeType(file.name);
        if (mimeType) {
          const part = await fileToGenerativePart(file.url, mimeType);
          if (part) {
            messageParts.push(part);
            attachedFileNames.push(`[AI-only] ${file.name}`);
          }
        }
      }
    }

    // 2. Process user-attached files
    if (attachments && attachments.length > 0) {
      for (const file of attachments) {
        const mimeType = getMimeType(file.name);
        if (mimeType) {
          const part = await fileToGenerativePart(file.url, mimeType);
          if (part) {
            messageParts.push(part);
            attachedFileNames.push(file.name);
          } else {
            unsupportedFileNames.push(file.name);
          }
        } else {
          unsupportedFileNames.push(file.name);
        }
      }
    }

    if (unsupportedFileNames.length > 0) {
      messageParts.push({
        text: `\n\n[ไฟล์แนบเพิ่มเติมที่ไม่รองรับการอ่านเนื้อหา: ${unsupportedFileNames.join(", ")}]`
      });
    }

    // 3. Append the user prompt last
    messageParts.push({ text: userMessage });

    const chat = ai.chats.create({
      model: "gemini-2.5-flash",
      history: [
        { role: "user", parts: [{ text: "สวัสดี คุณทำอะไรได้บ้าง?" }] },
        { role: "model", parts: [{ text: systemPrompt }] },
        ...history,
      ],
      config: {
        maxOutputTokens: 8192,
        temperature: 0.7,
      },
    });

    const result = await chat.sendMessage({ message: messageParts });
    const text = result.text;

    // Log the interaction in the database
    if (studentId && lessonContext?.id && lessonContext?.courseId) {
      const allFiles = [...attachedFileNames, ...unsupportedFileNames];
      const loggedMessage = userMessage + (allFiles.length > 0
        ? "\n\n[ไฟล์แนบ: " + allFiles.join(", ") + "]"
        : "");

      supabase.from("ai_chat_logs").insert({
        student_id: studentId,
        lesson_id: lessonContext.id,
        course_id: lessonContext.courseId,
        message: loggedMessage,
        reply: text,
        mode: mode || "chat"
      }).then(({ error }) => {
        if (error) console.error("[AI Chat Log Error]", error);
      });
    }

    return NextResponse.json({ reply: text });
  } catch (err) {
    console.error("[AI Chat Error]", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
