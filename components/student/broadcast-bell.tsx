"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import { BellIcon, PinIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Database } from "@/lib/database.types"
import { DEFAULT_DOMAIN } from "@/lib/course-access"
import { isTutorOnlyRole } from "@/lib/roles"
import { matchesYearLevel } from "@/lib/year-level"
import { supabase } from "@/lib/supabase"

type Broadcast = {
  id: string
  title: string
  body: string
  pinned: boolean | null
  created_at: string | null
  year_level: number[] | null
}

const SEEN_KEY = "last_seen_broadcast_time"

/** Broadcasts the student may see (year filter), newest first, live-updated; `hasNew` = newer than the last one opened. */
function useBroadcasts() {
  const { data: session } = useSession()
  const tutorOnly = isTutorOnlyRole(session?.user?.role)
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
  const [hasNew, setHasNew] = useState(false)

  useEffect(() => {
    if (!session || tutorOnly) return
    let gradesList: Array<{ prefix: string; year_label: string }> = []
    let studentProfile: Database["public"]["Tables"]["users"]["Row"] | null = null

    const fetchBroadcasts = async () => {
      const freshNow = new Date().toISOString()
      const studentId = session.dbId
      const studentYear = session.user?.study_year ? Number(session.user.study_year) : null

      const [bRes, sgRes, uRes] = await Promise.all([
        supabase
          .from("broadcasts")
          .select("id,title,body,pinned,created_at,year_level")
          .or(`expires_at.is.null,expires_at.gt.${freshNow}`)
          .order("pinned", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(50),
        gradesList.length === 0
          ? supabase.from("student_grades").select("prefix, year_label").eq("domain", DEFAULT_DOMAIN)
          : Promise.resolve({ data: gradesList }),
        studentId && !studentProfile
          ? supabase.from("users").select("*").eq("id", studentId).maybeSingle()
          : Promise.resolve({ data: studentProfile }),
      ])

      if (sgRes?.data && gradesList.length === 0) gradesList = sgRes.data
      if (uRes?.data && !studentProfile) studentProfile = uRes.data

      const email = session.user?.email || ""
      const parsedStudentNo = email.match(/^(\d+)@/)?.[1] ?? ""
      const finalStudentNo = studentProfile?.student_no || parsedStudentNo
      const prefix = finalStudentNo ? String(finalStudentNo).substring(0, 2) : ""
      const studentLabel = gradesList.find((g) => g.prefix === prefix)?.year_label ?? null

      const list = ((bRes.data || []) as Broadcast[])
        .filter((b) => matchesYearLevel(b.year_level, studentYear, studentLabel))
        .slice(0, 10)
      setBroadcasts(list)

      if (list.length > 0) {
        const lastSeen = localStorage.getItem(SEEN_KEY)
        const newest = list[0].created_at
        setHasNew(!lastSeen || (!!newest && new Date(newest).getTime() > new Date(lastSeen).getTime()))
      }
    }

    fetchBroadcasts()
    const channel = supabase
      .channel("public:broadcasts_nav")
      .on("postgres_changes", { event: "*", schema: "public", table: "broadcasts" }, () => fetchBroadcasts())
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [session, tutorOnly])

  const markSeen = () => {
    setHasNew(false)
    if (broadcasts[0]?.created_at) localStorage.setItem(SEEN_KEY, broadcasts[0].created_at)
  }
  return { broadcasts, hasNew, markSeen, tutorOnly }
}

/** Header bell: latest announcements in a popover, red dot while there is an unseen one. */
export function BroadcastBell() {
  const pathname = usePathname() || ""
  const { broadcasts, hasNew, markSeen, tutorOnly } = useBroadcasts()
  const [open, setOpen] = useState(false)
  const onPage = pathname === "/s/broadcasts"

  // being on the announcements page counts as having seen them
  useEffect(() => {
    if (!onPage || broadcasts.length === 0) return
    const timer = setTimeout(markSeen, 0)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onPage, broadcasts])

  if (tutorOnly) return null

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) markSeen()
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="การแจ้งเตือน" className="relative">
          <BellIcon />
          {hasNew && <span className="absolute right-2 top-2 size-2 rounded-full bg-destructive ring-2 ring-background" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3.5 py-2.5">
          <span className="text-sm font-semibold">ประกาศ</span>
          <Link href="/s/broadcasts" className="text-xs text-primary hover:underline" onClick={() => setOpen(false)}>
            ดูทั้งหมด
          </Link>
        </div>
        <ScrollArea className="[&>[data-slot=scroll-area-viewport]]:max-h-96">
          {broadcasts.length === 0 ? (
            <p className="px-3.5 py-6 text-center text-sm text-muted-foreground">ยังไม่มีประกาศ</p>
          ) : (
            broadcasts.map((b) => (
              <div key={b.id} className="border-b px-3.5 py-2.5 last:border-b-0">
                <div className="flex items-center gap-1.5 text-sm font-medium">
                  {b.pinned && <PinIcon className="size-3 text-muted-foreground" aria-label="ปักหมุด" />}
                  {b.title}
                </div>
                {b.body && <p className="line-clamp-2 text-xs text-muted-foreground">{b.body}</p>}
              </div>
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
