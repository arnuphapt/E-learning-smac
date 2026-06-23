import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";

export async function POST(req) {
  let toEmail = "";
  let subjectStr = "";
  let bccEmails = null;
  try {
    const { to, bcc, subject, html, text } = await req.json();
    subjectStr = subject;
    bccEmails = bcc;

    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT || "587";
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || user || "noreply@smnc.ac.th";

    const finalTo = to || from;
    toEmail = finalTo;

    console.log("=== SEND EMAIL REQUEST ===");
    console.log("To (resolved):", finalTo);
    console.log("From:", from);
    console.log("Bcc:", bcc);
    console.log("Subject:", subject);
    console.log("Text Body:", text);
    console.log("==========================");

    if (!host || !user || !pass) {
      console.warn("SMTP credentials not fully configured in env. Email sending simulated via console log.");
      
      // Log simulation success
      writeLog("SIMULATED", finalTo, subject, "Simulated sending (credentials missing)", bcc);
      return Response.json({ success: true, simulated: true });
    }

    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(port),
      secure: port === "465",
      auth: {
        user,
        pass,
      },
    });

    const bccList = Array.isArray(bcc) ? bcc : (bcc ? [bcc] : []);

    let messageIds = [];
    if (bccList.length === 0) {
      const info = await transporter.sendMail({
        from,
        to: finalTo,
        subject,
        text,
        html,
      });
      messageIds.push(info.messageId);
      console.log("Email sent successfully. Message ID:", info.messageId);
      writeLog("SUCCESS", finalTo, subject, `MsgID: ${info.messageId}`, null);
    } else {
      // Chunk BCC to avoid SMTP limits (Gmail limits to 100 recipients per message)
      const CHUNK_SIZE = 90;
      for (let i = 0; i < bccList.length; i += CHUNK_SIZE) {
        const chunk = bccList.slice(i, i + CHUNK_SIZE);
        const info = await transporter.sendMail({
          from,
          to: finalTo,
          bcc: chunk,
          subject,
          text,
          html,
        });
        messageIds.push(info.messageId);
        console.log(`Chunk ${Math.floor(i/CHUNK_SIZE) + 1} sent. Message ID:`, info.messageId);
        writeLog("SUCCESS", finalTo, subject, `Chunk ${Math.floor(i/CHUNK_SIZE) + 1} MsgID: ${info.messageId}`, chunk);
      }
    }

    return Response.json({ success: true, messageIds });
  } catch (error) {
    console.error("Failed to send email:", error);
    
    // Log failure
    writeLog("FAILED", toEmail, subjectStr, error.message, bccEmails);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

function writeLog(status, to, subject, detail, bcc) {
  try {
    const logDir = path.join(process.cwd(), "logs");
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const logPath = path.join(logDir, "email_delivery.log");
    
    let targetInfo = String(to || "");
    if (bcc && bcc.length > 0) {
      const bccStr = Array.isArray(bcc) ? bcc.join(", ") : String(bcc);
      targetInfo = `${targetInfo} (BCC: ${bccStr})`;
    }

    const logEntry = `[${new Date().toLocaleString("th-TH")}] ${status.padEnd(9)} | To: ${targetInfo.padEnd(60)} | Subject: ${String(subject).padEnd(50)} | Detail: ${detail}\n`;
    fs.appendFileSync(logPath, logEntry, "utf8");
  } catch (e) {
    console.error("Failed to write to email_delivery.log:", e);
  }
}
