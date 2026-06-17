import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req) {
  try {
    const { to, subject, html, text } = await req.json();

    const host = process.env.SMTP_HOST;
    const port = process.env.SMTP_PORT || "587";
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || user || "noreply@smnc.ac.th";

    console.log("=== SEND EMAIL REQUEST ===");
    console.log("To:", to);
    console.log("Subject:", subject);
    console.log("Text Body:", text);
    console.log("==========================");

    if (!host || !user || !pass) {
      console.warn("SMTP credentials not fully configured in env. Email sending simulated via console log.");
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

    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
    });

    console.log("Email sent successfully. Message ID:", info.messageId);
    return Response.json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error("Failed to send email:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
