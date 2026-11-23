import Link from "next/link"
import { LandingBrand } from "./brand"

const columns = [
  {
    title: "ระบบ",
    links: [
      { href: "/login", label: "เข้าสู่ระบบ" },
      { href: "#features", label: "จุดเด่น" },
      { href: "#about", label: "เกี่ยวกับ" },
    ],
  },
  {
    title: "สำหรับผู้เรียน",
    links: [
      { href: "/s/courses", label: "รายวิชา" },
      { href: "/s/courses", label: "แบบทดสอบ" },
      { href: "/s/assignments", label: "ส่งงาน" },
    ],
  },
]

const linkClass = "text-muted-foreground hover:text-foreground"

export function LandingFooter() {
  return (
    <footer className="border-t bg-muted/40 py-12">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="flex flex-wrap justify-between gap-10">
          <div className="max-w-sm">
            <LandingBrand />
            <p className="mt-4 text-sm leading-7 text-muted-foreground">ระบบการเรียนรู้ออนไลน์สำหรับนักศึกษาพยาบาล วิทยาลัยพยาบาลศรีมหาสารคาม คณะพยาบาลศาสตร์ สถาบันพระบรมราชชนก</p>
          </div>
          <div className="flex gap-16">
            {columns.map((c) => (
              <div key={c.title} className="flex flex-col gap-2 text-sm">
                <h4 className="mb-1 font-semibold">{c.title}</h4>
                {c.links.map((l) =>
                  l.href.startsWith("#") ? (
                    <a key={l.label} href={l.href} className={linkClass}>{l.label}</a>
                  ) : (
                    <Link key={l.label} href={l.href} className={linkClass}>{l.label}</Link>
                  ),
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-10 flex flex-wrap justify-between gap-3 border-t pt-6 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear() + 543} วิทยาลัยพยาบาลศรีมหาสารคาม · สถาบันพระบรมราชชนก</span>
          <span>ออกแบบเพื่อการเรียนรู้ของนักศึกษาพยาบาล</span>
        </div>
      </div>
    </footer>
  )
}
