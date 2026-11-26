"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { LandingBrand } from "./brand"

const links = [
  { href: "#about", label: "เกี่ยวกับระบบ" },
  { href: "#features", label: "จุดเด่น" },
  { href: "#mission", label: "วิสัยทัศน์" },
]

export function LandingHeader() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <nav className={cn("nav", scrolled && "scrolled")} id="nav" aria-label="เมนูหลัก">
      <div className="nav-in">
        <LandingBrand subtitle="พื้นที่เรียนรู้ดิจิทัลเกี่ยวกับสาระสำคัญด้านการพยาบาล" />
        <div className="nav-links">
          {links.map((l) => (
            <a key={l.href} href={l.href}>
              {l.label}
            </a>
          ))}
        </div>
        <Button asChild className="btn btn-primary">
          <Link href="/login">
            เข้าสู่ระบบ
            <ArrowRight className="ar size-[18px]" aria-hidden />
          </Link>
        </Button>
      </div>
    </nav>
  )
}
