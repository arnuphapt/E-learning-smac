"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import "./login.css";

function GoogleIcon() {
  return (
    <svg className="google-icon" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11.96 11.96 0 0 0 0 12c0 1.94.46 3.77 1.28 5.4l3.56-2.77.01-.54z" fill="#FBBC05" />
      <path d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.09 14.97 0 12 0 7.7 0 3.99 2.47 2.18 6.07l3.66 2.84c.87-2.6 3.3-4.16 6.16-4.16z" fill="#EA4335" />
    </svg>
  );
}

function LoginContent() {
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const error = searchParams?.get("error") || null;

  const handleGoogleLogin = async () => {
    setLoading(true);
    await signIn("google", { callbackUrl: "/s/courses" });
  };

  return (
    <div className="login-page">
      {/* Background EKG line */}
      <svg className="login-ekg" height="120" viewBox="0 0 1600 120" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0,60 L420,60 L450,60 L470,30 L500,95 L525,15 L552,60 L600,60 L1010,60 L1040,60 L1062,28 L1092,96 L1118,18 L1144,60 L1200,60 L1600,60" />
      </svg>

      <div className="login-card">
        {/* Brand */}
        <div className="login-brand">
          <div className="login-mark">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <div className="login-brand-text">
            <div className="name">Digital learning space</div>
            <div className="sub">พื้นที่เรียนรู้ดิจิทัลเกี่ยวกับสาระสำคัญทางการพยาบาล</div>
          </div>
        </div>

        {/* Title */}
        <h1 className="login-title">เข้าสู่ระบบ</h1>
        <p className="login-desc">ลงชื่อเข้าใช้เพื่อเข้าถึงรายวิชา บทเรียน และสื่อการสอนทั้งหมด</p>

        {/* Error message */}
        {error && (
          <div className="login-error">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
            <span>
              {error === "OAuthAccountNotLinked"
                ? "อีเมลนี้ถูกใช้กับวิธีการเข้าสู่ระบบอื่นแล้ว"
                : "เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่อีกครั้ง"}
            </span>
          </div>
        )}

        {/* Google Sign In */}
        <button
          className="login-google-btn"
          onClick={handleGoogleLogin}
          disabled={loading}
          id="google-login-btn"
        >
          {loading ? (
            <span className="spinner" />
          ) : (
            <GoogleIcon />
          )}
          {loading ? "กำลังดำเนินการ…" : "เข้าสู่ระบบด้วย Google"}
        </button>

        {/* Footer */}
        <div className="login-footer">
          <Link href="/">← กลับหน้าหลัก</Link>
          <p style={{ marginTop: 12 }}>
            วิทยาลัยพยาบาลศรีมหาสารคาม · สถาบันพระบรมราชชนก
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="login-page">
        <div className="login-card" style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 200 }}>
          <span className="spinner" style={{ borderLeftColor: "var(--primary)" }} />
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
