import Image from "next/image"
import { ClipboardCheck, Clock } from "lucide-react"
import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

type Feature = {
  num: string
  title: string
  text: string
  chips: { label: string; withClock?: boolean }[]
  reversed?: boolean
  media: ReactNode
}

const features: Feature[] = [
  {
    num: "๐๑ — ยืดหยุ่น",
    title: "เรียนได้ทุกที่ ทุกเวลา ไม่จำกัด",
    text: "เข้าเรียนได้ไม่จำกัดจำนวนครั้งและไม่จำกัดเวลา ทั้งทบทวนก่อนสอบ เรียนเสริมในหัวข้อที่ยังไม่เข้าใจ หรือเรียนล่วงหน้าเพื่อเตรียมความพร้อม ระบบเปิดให้เข้าถึงตลอด 24 ชั่วโมง ช่วยให้บริหารเวลาเรียนได้อย่างอิสระ เหมาะกับวิถีชีวิตของนักศึกษาพยาบาล",
    chips: [
      { label: "ตลอด 24 ชั่วโมง", withClock: true },
      { label: "คอมพิวเตอร์" },
      { label: "แท็บเล็ต" },
      { label: "มือถือ" },
    ],
    media: (
      <div className="feat-illu feat-illu-teal">
        <span className="ring size-[120px]" aria-hidden />
        <span className="ring size-[200px]" aria-hidden />
        <span className="ring size-[280px]" aria-hidden />
        <Clock className="glyph size-[92px]" strokeWidth={1.5} aria-hidden />
      </div>
    ),
  },
  {
    num: "๐๒ — สื่อคุณภาพ",
    title: "สื่อการเรียนรู้ที่หลากหลายและทันสมัย",
    text: "ประกอบด้วยเอกสารประกอบการสอน สไลด์บรรยาย วิดีโอการสอน คลิปสาธิตหัตถการทางการพยาบาล กรณีศึกษา และแหล่งความรู้เพิ่มเติม จัดทำและคัดสรรโดยคณาจารย์ผู้เชี่ยวชาญ เพื่อให้เข้าใจเนื้อหาได้ลึกซึ้งและนำไปประยุกต์ใช้ในการปฏิบัติจริงได้อย่างมั่นใจ",
    chips: [{ label: "วิดีโอการสอน" }, { label: "คลิปสาธิตหัตถการ" }, { label: "กรณีศึกษา" }],
    reversed: true,
    media: (
      <div className="feat-card">
        <Image src="/ed97f349-0e91-423b-8fbf-6b8629cf37b6.jpg" alt="ภาพสื่อการสอน / วิดีโอ" width={800} height={550} />
      </div>
    ),
  },
  {
    num: "๐๓ — ประเมินตนเอง",
    title: "ฝึกฝนและประเมินตนเองผ่านแบบฝึกหัด",
    text: "มีแบบฝึกหัดและแบบทดสอบในแต่ละหน่วยการเรียน เพื่อทบทวนและประเมินความเข้าใจของตนเองอย่างต่อเนื่อง การฝึกทำอย่างสม่ำเสมอช่วยเสริมความรู้ให้แม่นยำ พัฒนาทักษะการคิดวิเคราะห์ และเตรียมพร้อมสำหรับการสอบขึ้นทะเบียนใบประกอบวิชาชีพการพยาบาลในอนาคต",
    chips: [{ label: "Pre-test / Post-test" }, { label: "เฉลยพร้อมคำอธิบาย" }, { label: "ติดตามพัฒนาการ" }],
    media: (
      <div className="feat-illu feat-illu-emerald">
        <span className="ring size-[140px]" aria-hidden />
        <span className="ring size-[230px]" aria-hidden />
        <ClipboardCheck className="glyph size-[88px]" strokeWidth={1.5} aria-hidden />
      </div>
    ),
  },
  {
    num: "๐๔ — สะดวก",
    title: "ส่งการบ้านสะดวกผ่านระบบออนไลน์",
    text: "รองรับการส่งงานและการบ้านผ่านช่องทางออนไลน์ได้โดยตรง อัปโหลดงานภายในเวลาที่กำหนด ติดตามสถานะการส่ง และรับผลตอบกลับจากอาจารย์ผู้สอนได้อย่างเป็นระบบ ช่วยลดขั้นตอนที่ยุ่งยาก และทำให้การสื่อสารระหว่างผู้เรียนกับผู้สอนเป็นไปอย่างราบรื่น",
    chips: [{ label: "อัปโหลดไฟล์งาน" }, { label: "ติดตามสถานะ" }, { label: "ผลตอบกลับจากอาจารย์" }],
    reversed: true,
    media: (
      <div className="feat-card">
        <Image src="/4c1d7fe9-4c3f-491a-896f-19ebef35f6a9.jpg" alt="ภาพการส่งงานออนไลน์" width={800} height={550} />
      </div>
    ),
  },
]

export function LandingFeatures() {
  return (
    <section className="section features-section" id="features">
      <div className="wrap">
        <div className="section-head reveal">
          <span className="eyebrow">จุดเด่นของระบบ</span>
          <h2>
            ทุกสิ่งที่นักศึกษาต้องการ
            <br />
            เพื่อการเรียนรู้ที่มีประสิทธิภาพ
          </h2>
        </div>
        <div className="feat-list">
          {features.map((f) => (
            <article key={f.num} className={cn("feat reveal", f.reversed && "rev")}>
              <div className="feat-copy">
                <div className="feat-num">{f.num}</div>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
                <div className="feat-chips">
                  {f.chips.map((c) => (
                    <span key={c.label} className="chip">
                      {c.withClock && <Clock className="size-4" strokeWidth={2} aria-hidden />}
                      {c.label}
                    </span>
                  ))}
                </div>
              </div>
              <div className="feat-media">{f.media}</div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
