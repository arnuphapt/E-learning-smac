import Image from "next/image"
import { ClipboardCheck, Clock } from "lucide-react"
import type { ReactNode } from "react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type Feature = {
  num: string
  title: string
  text: string
  chips: string[]
  media: ReactNode
}

const imgClass = "aspect-[16/11] w-full rounded-xl border object-cover shadow-sm"
const illuClass = "grid aspect-[16/11] w-full place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm"

const features: Feature[] = [
  {
    num: "๐๑ — ยืดหยุ่น",
    title: "เรียนได้ทุกที่ ทุกเวลา ไม่จำกัด",
    text: "เข้าเรียนได้ไม่จำกัดจำนวนครั้งและไม่จำกัดเวลา ทั้งทบทวนก่อนสอบ เรียนเสริมในหัวข้อที่ยังไม่เข้าใจ หรือเรียนล่วงหน้าเพื่อเตรียมความพร้อม ระบบเปิดให้เข้าถึงตลอด 24 ชั่วโมง ช่วยให้บริหารเวลาเรียนได้อย่างอิสระ เหมาะกับวิถีชีวิตของนักศึกษาพยาบาล",
    chips: ["ตลอด 24 ชั่วโมง", "คอมพิวเตอร์", "แท็บเล็ต", "มือถือ"],
    media: (
      <div className={illuClass}>
        <Clock className="size-20" strokeWidth={1.5} aria-hidden />
      </div>
    ),
  },
  {
    num: "๐๒ — สื่อคุณภาพ",
    title: "สื่อการเรียนรู้ที่หลากหลายและทันสมัย",
    text: "ประกอบด้วยเอกสารประกอบการสอน สไลด์บรรยาย วิดีโอการสอน คลิปสาธิตหัตถการทางการพยาบาล กรณีศึกษา และแหล่งความรู้เพิ่มเติม จัดทำและคัดสรรโดยคณาจารย์ผู้เชี่ยวชาญ เพื่อให้เข้าใจเนื้อหาได้ลึกซึ้งและนำไปประยุกต์ใช้ในการปฏิบัติจริงได้อย่างมั่นใจ",
    chips: ["วิดีโอการสอน", "คลิปสาธิตหัตถการ", "กรณีศึกษา"],
    media: <Image src="/ed97f349-0e91-423b-8fbf-6b8629cf37b6.jpg" alt="ภาพสื่อการสอน / วิดีโอ" width={800} height={550} className={imgClass} />,
  },
  {
    num: "๐๓ — ประเมินตนเอง",
    title: "ฝึกฝนและประเมินตนเองผ่านแบบฝึกหัด",
    text: "มีแบบฝึกหัดและแบบทดสอบในแต่ละหน่วยการเรียน เพื่อทบทวนและประเมินความเข้าใจของตนเองอย่างต่อเนื่อง การฝึกทำอย่างสม่ำเสมอช่วยเสริมความรู้ให้แม่นยำ พัฒนาทักษะการคิดวิเคราะห์ และเตรียมพร้อมสำหรับการสอบขึ้นทะเบียนใบประกอบวิชาชีพการพยาบาลในอนาคต",
    chips: ["Pre-test / Post-test", "เฉลยพร้อมคำอธิบาย", "ติดตามพัฒนาการ"],
    media: (
      <div className={illuClass}>
        <ClipboardCheck className="size-20" strokeWidth={1.5} aria-hidden />
      </div>
    ),
  },
  {
    num: "๐๔ — สะดวก",
    title: "ส่งการบ้านสะดวกผ่านระบบออนไลน์",
    text: "รองรับการส่งงานและการบ้านผ่านช่องทางออนไลน์ได้โดยตรง อัปโหลดงานภายในเวลาที่กำหนด ติดตามสถานะการส่ง และรับผลตอบกลับจากอาจารย์ผู้สอนได้อย่างเป็นระบบ ช่วยลดขั้นตอนที่ยุ่งยาก และทำให้การสื่อสารระหว่างผู้เรียนกับผู้สอนเป็นไปอย่างราบรื่น",
    chips: ["อัปโหลดไฟล์งาน", "ติดตามสถานะ", "ผลตอบกลับจากอาจารย์"],
    media: <Image src="/4c1d7fe9-4c3f-491a-896f-19ebef35f6a9.jpg" alt="ภาพการส่งงานออนไลน์" width={800} height={550} className={imgClass} />,
  },
]

export function LandingFeatures() {
  return (
    <section id="features" className="py-20">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="mb-12 max-w-2xl">
          <Badge variant="outline">จุดเด่นของระบบ</Badge>
          <h2 className="mt-4 font-serif text-3xl font-semibold leading-snug sm:text-4xl">
            ทุกสิ่งที่นักศึกษาต้องการ
            <br />
            เพื่อการเรียนรู้ที่มีประสิทธิภาพ
          </h2>
        </div>
        <div className="divide-y border-y">
          {features.map((f, i) => (
            <article key={f.num} className="grid items-center gap-8 py-12 md:grid-cols-2 md:gap-14">
              <div className={cn(i % 2 === 1 && "md:order-2")}>
                <div className="font-serif text-sm font-semibold text-muted-foreground">{f.num}</div>
                <h3 className="mt-3 font-serif text-2xl font-semibold leading-snug sm:text-3xl">{f.title}</h3>
                <p className="mt-4 leading-8 text-muted-foreground">{f.text}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {f.chips.map((c) => (
                    <Badge key={c} variant="secondary" className="px-3 py-1 text-sm">
                      {c}
                    </Badge>
                  ))}
                </div>
              </div>
              {f.media}
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
