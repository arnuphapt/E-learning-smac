import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Clock, Video, type LucideIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

function FloatingStat({ icon: Icon, title, text, className }: { icon: LucideIcon; title: string; text: string; className: string }) {
  return (
    <Card className={cn("absolute flex-row items-center gap-3 px-4 py-3 shadow-lg", className)}>
      <span className="grid size-10 place-items-center rounded-lg bg-muted">
        <Icon className="size-5" aria-hidden />
      </span>
      <div>
        <div className="text-lg font-bold leading-none">{title}</div>
        <div className="mt-1 text-xs text-muted-foreground">{text}</div>
      </div>
    </Card>
  )
}

export function LandingHero() {
  return (
    <section id="top" className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
      <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_.95fr]">
        <div>
          <Badge variant="secondary" className="h-auto whitespace-normal py-1 text-xs">
            วิทยาลัยพยาบาลศรีมหาสารคาม · คณะพยาบาลศาสตร์ สถาบันพระบรมราชชนก
          </Badge>
          <h1 className="mt-5 font-serif text-4xl font-semibold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
            ยินดีต้อนรับสู่
            <br />
            ระบบการเรียนรู้ออนไลน์
          </h1>
          <div className="mt-3 font-serif text-xl text-muted-foreground sm:text-2xl">พื้นที่เรียนรู้ดิจิทัลเกี่ยวกับสาระสำคัญด้านการพยาบาล</div>
          <p className="mt-6 max-w-xl leading-8 text-muted-foreground">
            พื้นที่แห่งการเรียนรู้ที่ออกแบบมาเพื่อสนับสนุนการศึกษาของนักศึกษาพยาบาลให้เกิดประสิทธิภาพสูงสุด ทั้งในและนอกชั้นเรียน — เพียงเข้าสู่ระบบก็พร้อมเริ่มต้นการเรียนรู้ได้ทันที
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link href="/login">
                เริ่มเรียนรู้
                <ArrowRight />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#features">รู้จักระบบ</a>
            </Button>
          </div>
          <p className="mt-8 text-sm text-muted-foreground">เปิดให้เข้าถึงได้ตลอด 24 ชั่วโมง บนทุกอุปกรณ์</p>
        </div>
        <div className="relative mx-auto w-full max-w-md">
          <Image
            src="/e4ac61bf-a1f3-4995-8a22-0604e9dd4f35.jpg"
            alt="ภาพนักศึกษาพยาบาล / การเรียนการสอน"
            width={640}
            height={800}
            priority
            className="aspect-[4/5] w-full rounded-2xl border object-cover shadow-xl"
          />
          <FloatingStat icon={Clock} title="24 ชม." text="เรียนได้ไม่จำกัดเวลา" className="-left-2 bottom-8 sm:-left-8" />
          <FloatingStat icon={Video} title="วิดีโอ + สื่อ" text="สื่อการสอนหลากหลาย" className="-right-2 top-8 sm:-right-6" />
        </div>
      </div>
    </section>
  )
}
