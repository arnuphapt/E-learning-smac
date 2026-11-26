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

export function LandingFooter() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-grid">
          <div>
            <LandingBrand title="Digital learning space" asLink={false} />
            <p className="desc">
              ระบบการเรียนรู้ออนไลน์สำหรับนักศึกษาพยาบาล วิทยาลัยพยาบาลศรีมหาสารคาม คณะพยาบาลศาสตร์ สถาบันพระบรมราชชนก
            </p>
          </div>
          <div className="footer-links">
            {columns.map((c) => (
              <div key={c.title} className="footer-col">
                <h4>{c.title}</h4>
                {c.links.map((l) =>
                  l.href.startsWith("#") ? (
                    <a key={l.label} href={l.href}>
                      {l.label}
                    </a>
                  ) : (
                    <Link key={l.label} href={l.href}>
                      {l.label}
                    </Link>
                  ),
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="footer-bot">
          <span>© {new Date().getFullYear() + 543} วิทยาลัยพยาบาลศรีมหาสารคาม · สถาบันพระบรมราชชนก</span>
          <span>ออกแบบเพื่อการเรียนรู้ของนักศึกษาพยาบาล</span>
        </div>
      </div>
    </footer>
  )
}
