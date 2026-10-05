import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getToken } from "next-auth/jwt";
import { supabaseAuthHeaders } from "@/lib/supabase-token";
import { toKey, readObject } from "@/lib/r2";
import { canViewKey } from "@/lib/file-access";
import { isStaffRole } from "@/lib/roles";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { claimAiQuota, fillAiClaim, releaseAiClaim } from "@/lib/ai-quota";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// ref = stored R2 key (or legacy public URL). Read straight from R2 with server-only credentials.
async function fileToGenerativePart(ref, mimeType) {
  try {
    const key = toKey(ref);
    const buffer = key && (await readObject(key));
    if (!buffer) throw new Error(`Cannot read file from R2: ${ref}`);
    return {
      inlineData: {
        data: buffer.toString("base64"),
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
  let claimId = null; // quota claim row of this request (students), released if anything below fails
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = await req.json();
    const { messages, lessonContext, mode, attachments, sessionId } = body;

    // identity comes only from the verified session, never from the request body
    const currentUserId = token.dbId || token.sub;
    const role = token.role || "student";
    const isBypassed = isStaffRole(role);

    // Create request-scoped Supabase client
    const supabaseServer = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: {
          headers: supabaseAuthHeaders(token),
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
    // the call is logged only when the UI sent both lesson and course (as before); without them nothing is kept
    const logLesson = !!(lessonContext?.id && lessonContext?.courseId);
    // summarize and chat are the only two prompts below: the logged mode cannot be a client-made string that dodges the counter
    const logMode = mode === "summarize" ? "summarize" : "chat";

    if (currentUserId && !isBypassed) {
      // Atomic: count today's calls and insert a claim row under a per-student lock (migration 20261006040000), so N
      // parallel requests cannot all pass the check. The claim is filled with the reply below, or deleted if the call fails.
      const claim = await claimAiQuota(supabaseAdmin(), {
        studentId: currentUserId,
        limit: dailyLimit,
        mode: logMode,
        lessonId: logLesson ? lessonContext.id : null,
        courseId: logLesson ? lessonContext.courseId : null,
        sessionId,
      });
      if (!claim.claimId) {
        return NextResponse.json(
          { error: "rate_limit_exceeded", used: claim.used, limit: dailyLimit },
          { status: 429 }
        );
      }
      claimId = claim.claimId;
      todayCount = claim.used - 1;
    }

    // Fetch AI-only documents from lessons table
    let aiDocs = [];
    if (lessonContext?.id) {
      const { data: dbLesson } = await supabaseServer
        .from("lessons")
        .select("ai_documents, allow_ai, status")
        .eq("id", lessonContext.id)
        .single();
      // AI-only docs are attached only for lessons with AI enabled and published ("active"); staff may preview drafts.
      const aiAllowed = dbLesson && dbLesson.allow_ai !== false && (dbLesson.status === "active" || isBypassed);
      if (aiAllowed && Array.isArray(dbLesson.ai_documents)) {
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
        // attachments come from the browser: only read keys this user may view (never AI-only docs)
        const attKey = toKey(file.url);
        if (mimeType && attKey && (await canViewKey(token, attKey))) {
          const part = await fileToGenerativePart(attKey, mimeType);
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
        if (claimId) {
          // students: fill the claim made at the quota check
          if (text) {
            await fillAiClaim(supabaseAdmin(), claimId, { message: loggedMessage, reply: text });
            claimId = null;
          }
        } else {
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
        }
      } catch (err) {
        console.error("[AI Chat Log Exception]", err);
      }
    }
    // claim not filled (no lesson context, empty reply, or the fill failed): nothing was logged, so nothing is counted
    if (claimId) {
      await releaseAiClaim(supabaseAdmin(), claimId);
      claimId = null;
    }

    return NextResponse.json({
      reply: text,
      rateLimitInfo: isBypassed ? null : {
        used: todayCount + 1,
        limit: dailyLimit
      }
    });
  } catch (err) {
    if (claimId) await releaseAiClaim(supabaseAdmin(), claimId); // the call failed: it must not count against the quota
    console.error("[AI Chat Error]", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
