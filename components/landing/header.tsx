import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { LandingBrand } from "./brand"

const links = [
  { href: "#about", label: "เกี่ยวกับระบบ" },
  { href: "#features", label: "จุดเด่น" },
  { href: "#mission", label: "วิสัยทัศน์" },
]

export function LandingHeader() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-5 py-3 sm:px-8">
        <LandingBrand subtitle="พื้นที่เรียนรู้ดิจิทัลเกี่ยวกับสาระสำคัญด้านการพยาบาล" />
        <nav aria-label="เมนูหลัก" className="ml-auto hidden gap-1 md:flex">
          {links.map((l) => (
            <Button key={l.href} variant="ghost" asChild>
              <a href={l.href}>{l.label}</a>
            </Button>
          ))}
        </nav>
        <Button asChild className="ml-auto md:ml-0">
          <Link href="/login">
            เข้าสู่ระบบ
            <ArrowRight />
          </Link>
        </Button>
      </div>
    </header>
  )
}
