import { Badge } from "@/components/ui/badge"

export function LandingAbout() {
  return (
    <section id="about" className="bg-muted/40 py-20">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Badge variant="outline">เกี่ยวกับระบบ</Badge>
        <p className="mt-6 max-w-4xl font-serif text-2xl leading-relaxed sm:text-3xl">
          พื้นที่เรียนรู้ดิจิทัลเกี่ยวกับ
          <b className="font-semibold">สาระสำคัญด้านการพยาบาลนี้ ได้รวบรวมสาระสำคัญในหลากหลายรายวิชาเกี่ยวกับวิชาชีพการพยาบาลและการผดุงครรภ์ไว้อย่างครบถ้วน</b>
        </p>
      </div>
    </section>
  )
}
