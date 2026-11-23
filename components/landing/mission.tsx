import { Heart, MapPin } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

const em = "not-italic underline decoration-primary-foreground/40 underline-offset-8"

export function LandingMission() {
  return (
    <>
      <section id="mission" className="bg-primary py-24 text-primary-foreground">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <Badge variant="secondary">วิสัยทัศน์</Badge>
          <h2 className="mt-5 max-w-4xl font-serif text-3xl font-semibold leading-snug sm:text-5xl">
            ก้าวสู่การเป็น<em className={em}>พยาบาลวิชาชีพ</em>ที่มีคุณภาพ พร้อมดูแลผู้ใช้บริการและชุมชนด้วย<em className={em}>หัวใจความเป็นมนุษย์</em>{" "}
            <Heart className="inline size-8 align-baseline" aria-hidden />
          </h2>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-primary-foreground/70">
            เราหวังเป็นอย่างยิ่งว่าระบบ Digital learning space แห่งนี้จะเป็นเครื่องมือสำคัญที่ช่วยส่งเสริมการเรียนรู้ให้เกิดประสิทธิภาพ ควบคู่ไปกับการบ่มเพาะความรู้ ทักษะ และจิตวิญญาณความเป็นพยาบาล
          </p>
        </div>
      </section>
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <Card className="mx-auto max-w-3xl">
            <CardContent className="p-8 sm:p-12">
              <p className="font-serif text-xl leading-relaxed sm:text-2xl">ขอให้นักศึกษาทุกคนมีความสุขกับการเรียนรู้ และประสบความสำเร็จในเส้นทางวิชาชีพการพยาบาล</p>
              <div className="mt-8 flex items-center gap-4 border-t pt-6">
                <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
                  <MapPin className="size-6" aria-hidden />
                </span>
                <div>
                  <div className="text-sm font-semibold text-muted-foreground">ด้วยความปรารถนาดี</div>
                  <div className="text-lg font-bold">คณาจารย์</div>
                  <div className="text-sm text-muted-foreground">วิทยาลัยพยาบาลศรีมหาสารคาม · คณะพยาบาลศาสตร์ สถาบันพระบรมราชชนก</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  )
}
