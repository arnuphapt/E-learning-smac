import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export function LandingCta() {
  return (
    <section className="cta">
      <div className="wrap">
        <div className="cta-box reveal">
          <svg className="ekg2" height="70" viewBox="0 0 1200 70" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0,35 L500,35 L520,35 L538,12 L560,62 L580,6 L600,35 L700,35 L1200,35" fill="none" stroke="#fff" strokeWidth="2" />
          </svg>
          <div className="in">
            <h2>พร้อมเริ่มต้นการเรียนรู้แล้วหรือยัง?</h2>
            <p>เข้าสู่ระบบเพื่อเข้าถึงรายวิชา บทเรียน วิดีโอการสอน และแบบทดสอบทั้งหมดของคุณ</p>
            <Button asChild className="btn btn-primary btn-lg">
              <Link href="/login">
                เข้าสู่ระบบ Digital learning space
                <ArrowRight className="ar size-[19px]" aria-hidden />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}
