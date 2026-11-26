import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Clock, Video, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function FloatingBadge({
  icon: Icon,
  title,
  text,
  iconClassName,
  className,
}: {
  icon: LucideIcon
  title: string
  text: string
  iconClassName: string
  className: string
}) {
  return (
    <div className={cn("hero-badge", className)}>
      <span className={cn("ic", iconClassName)}>
        <Icon className="size-[22px]" aria-hidden />
      </span>
      <div>
        <div className="t">{title}</div>
        <div className="d">{text}</div>
      </div>
    </div>
  )
}

export function LandingHero() {
  return (
    <header className="hero" id="top">
      <div className="hero-bg" />
      <div className="hero-mesh" />
      <svg className="ekg" height="120" viewBox="0 0 1600 120" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0,60 L420,60 L450,60 L470,30 L500,95 L525,15 L552,60 L600,60 L1010,60 L1040,60 L1062,28 L1092,96 L1118,18 L1144,60 L1200,60 L1600,60" />
      </svg>
      <div className="wrap">
        <div className="hero-grid">
          <div className="hero-copy">
            <span className="eyebrow reveal in">วิทยาลัยพยาบาลศรีมหาสารคาม · คณะพยาบาลศาสตร์ สถาบันพระบรมราชชนก</span>
            <h1 className="reveal in d1">
              ยินดีต้อนรับสู่
              <br />
              <span className="hl">ระบบการเรียนรู้ออนไลน์</span>
            </h1>
            <div className="sub serif reveal in d1">พื้นที่เรียนรู้ดิจิทัลเกี่ยวกับสาระสำคัญด้านการพยาบาล</div>
            <p className="lead reveal in d2">
              พื้นที่แห่งการเรียนรู้ที่ออกแบบมาเพื่อสนับสนุนการศึกษาของนักศึกษาพยาบาลให้เกิดประสิทธิภาพสูงสุด ทั้งในและนอกชั้นเรียน — เพียงเข้าสู่ระบบก็พร้อมเริ่มต้นการเรียนรู้ได้ทันที
            </p>
            <div className="hero-cta reveal in d2">
              <Button asChild className="btn btn-primary btn-lg">
                <Link href="/login">
                  เริ่มเรียนรู้
                  <ArrowRight className="ar size-[19px]" aria-hidden />
                </Link>
              </Button>
              <Button asChild variant="ghost" className="btn btn-ghost btn-lg">
                <a href="#features">รู้จักระบบ</a>
              </Button>
            </div>
            <div className="hero-trust reveal in d3">
              <span className="av" aria-hidden>
                <span>นศ</span>
                <span>พย</span>
                <span>3</span>
              </span>
              เปิดให้เข้าถึงได้ตลอด 24 ชั่วโมง บนทุกอุปกรณ์
            </div>
          </div>
          <div className="hero-visual reveal in d2">
            <span className="dotgrid dg1" aria-hidden />
            <div className="hero-frame">
              <Image
                src="/e4ac61bf-a1f3-4995-8a22-0604e9dd4f35.jpg"
                alt="ภาพนักศึกษาพยาบาล / การเรียนการสอน"
                width={640}
                height={800}
                sizes="(min-width: 1024px) 480px, 90vw"
                priority
              />
            </div>
            <FloatingBadge icon={Clock} title="24 ชม." text="เรียนได้ไม่จำกัดเวลา" iconClassName="ic-teal" className="hb-1" />
            <FloatingBadge icon={Video} title="วิดีโอ + สื่อ" text="สื่อการสอนหลากหลาย" iconClassName="ic-coral" className="hb-2" />
          </div>
        </div>
      </div>
    </header>
  )
}
