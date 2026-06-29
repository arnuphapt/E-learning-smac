import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getToken } from "next-auth/jwt";

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
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const body = await req.json();
    const { messages, lessonContext, mode, studentId, attachments, sessionId } = body;

    const currentUserId = token?.dbId || token?.sub || studentId;
    const role = token?.role || "student";
    const isBypassed = ["instructor", "admin", "course_manager"].includes(role);

    // Create request-scoped Supabase client
    const supabaseServer = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            "x-user-id": currentUserId || "",
            "x-user-role": role,
          },
        },
      }
    );

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "messages array is required" }, { status: 400 });
    }

    // A. Fetch all config from DB
    const CONFIG_DEFAULTS = {
      daily_chat_limit: 15,
      session_token_limit: 20000,
      max_output_tokens: 2048,
      max_output_tokens_with_files: 4096,
    };
    let customPersona = "";
    let dailyLimit = CONFIG_DEFAULTS.daily_chat_limit;
    let SESSION_TOKEN_LIMIT = CONFIG_DEFAULTS.session_token_limit;
    let baseMaxOutputTokens = CONFIG_DEFAULTS.max_output_tokens;
    let fileMaxOutputTokens = CONFIG_DEFAULTS.max_output_tokens_with_files;

    try {
      const { data: settingsData } = await supabaseServer
        .from("ai_settings")
        .select("key, value");
      if (settingsData) {
        const get = (k) => settingsData.find((r) => r.key === k)?.value;
        if (get("persona")) customPersona = get("persona");
        if (get("daily_chat_limit")) dailyLimit = parseInt(get("daily_chat_limit"), 10) || CONFIG_DEFAULTS.daily_chat_limit;
        if (get("session_token_limit")) SESSION_TOKEN_LIMIT = parseInt(get("session_token_limit"), 10) || CONFIG_DEFAULTS.session_token_limit;
        if (get("max_output_tokens")) baseMaxOutputTokens = parseInt(get("max_output_tokens"), 10) || CONFIG_DEFAULTS.max_output_tokens;
        if (get("max_output_tokens_with_files")) fileMaxOutputTokens = parseInt(get("max_output_tokens_with_files"), 10) || CONFIG_DEFAULTS.max_output_tokens_with_files;
      }
    } catch (e) {
      console.error("Failed to fetch settings from database:", e);
    }

    const estimateTokens = (text) => Math.ceil((text || "").length / 2.5);
    const totalHistoryTokens = messages.reduce((sum, m) => sum + estimateTokens(m.content), 0);

    if (!isBypassed) {
      if (totalHistoryTokens > SESSION_TOKEN_LIMIT) {
        return NextResponse.json(
          { error: "session_token_limit", used: totalHistoryTokens, limit: SESSION_TOKEN_LIMIT },
          { status: 400 }
        );
      }
    }

    let todayCount = 0;

    if (currentUserId && !isBypassed) {
      // Get Bangkok local time start and end of today
      const bangkokTime = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
      const year = bangkokTime.getFullYear();
      const month = bangkokTime.getMonth();
      const date = bangkokTime.getDate();
      
      const startOfDay = new Date(Date.UTC(year, month, date, 0 - 7, 0, 0, 0));
      const endOfDay = new Date(Date.UTC(year, month, date, 24 - 7, 0, 0, 0));

      const { count, error } = await supabaseServer
        .from("ai_chat_logs")
        .select("*", { count: "exact", head: true })
        .eq("student_id", currentUserId)
        .in("mode", ["chat", "summarize"])
        .gte("created_at", startOfDay.toISOString())
        .lt("created_at", endOfDay.toISOString());

      if (error) {
        console.error("Failed to count today's chat logs:", error);
      } else {
        todayCount = count || 0;
        if (todayCount >= dailyLimit) {
          return NextResponse.json(
            { error: "rate_limit_exceeded", used: todayCount, limit: dailyLimit },
            { status: 429 }
          );
        }
      }
    }

    // Fetch AI-only documents from lessons table
    let aiDocs = [];
    if (lessonContext?.id) {
      const { data: dbLesson } = await supabaseServer
        .from("lessons")
        .select("ai_documents")
        .eq("id", lessonContext.id)
        .single();
      if (dbLesson && Array.isArray(dbLesson.ai_documents)) {
        aiDocs = dbLesson.ai_documents;
      }
    }

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

    // Build chat history for multi-turn (last 5 messages before the current one)
    const history = messages.slice(-6, -1).map((m) => {
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

    const hasFiles = (attachments && attachments.length > 0) || (aiDocs && aiDocs.length > 0);
    const maxOutputTokens = mode === "summarize" ? fileMaxOutputTokens : hasFiles ? fileMaxOutputTokens : baseMaxOutputTokens;

    const chat = ai.chats.create({
      model: "gemini-2.5-flash",
      history: [
        { role: "user", parts: [{ text: "สวัสดี คุณทำอะไรได้บ้าง?" }] },
        { role: "model", parts: [{ text: systemPrompt }] },
        ...history,
      ],
      config: {
        maxOutputTokens,
        temperature: 0.7,
      },
    });

    const result = await chat.sendMessage({ message: messageParts });
    const text = result.text;

    // Log the interaction in the database
    if (currentUserId && lessonContext?.id && lessonContext?.courseId) {
      const allFiles = [...attachedFileNames, ...unsupportedFileNames];
      const loggedMessage = userMessage + (allFiles.length > 0
        ? "\n\n[ไฟล์แนบ: " + allFiles.join(", ") + "]"
        : "");

      try {
        const { error } = await supabaseServer.from("ai_chat_logs").insert({
          student_id: currentUserId,
          lesson_id: lessonContext.id,
          course_id: lessonContext.courseId,
          message: loggedMessage,
          reply: text,
          mode: mode || "chat",
          session_id: sessionId
        });
        if (error) console.error("[AI Chat Log Error]", error);
      } catch (err) {
        console.error("[AI Chat Log Exception]", err);
      }
    }

    return NextResponse.json({
      reply: text,
      rateLimitInfo: isBypassed ? null : {
        used: todayCount + 1,
        limit: dailyLimit
      }
    });
  } catch (err) {
    console.error("[AI Chat Error]", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
