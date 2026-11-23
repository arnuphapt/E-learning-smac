import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export function LandingCta() {
  return (
    <section className="px-5 pb-20 sm:px-8">
      <div className="mx-auto max-w-6xl rounded-2xl bg-muted px-6 py-16 text-center sm:px-12">
        <h2 className="font-serif text-3xl font-semibold sm:text-4xl">พร้อมเริ่มต้นการเรียนรู้แล้วหรือยัง?</h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">เข้าสู่ระบบเพื่อเข้าถึงรายวิชา บทเรียน วิดีโอการสอน และแบบทดสอบทั้งหมดของคุณ</p>
        <Button size="lg" className="mt-8" asChild>
          <Link href="/login">
            เข้าสู่ระบบ Digital learning space
            <ArrowRight />
          </Link>
        </Button>
      </div>
    </section>
  )
}
