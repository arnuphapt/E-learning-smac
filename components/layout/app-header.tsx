"use client"

import type { ReactNode } from "react"
import Link from "next/link"
import { signOut, useSession } from "next-auth/react"
import { ChevronDownIcon, LogOutIcon } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { isStaffRole, isTutorOnlyRole } from "@/lib/roles"
import type { NavConfig } from "@/lib/nav/types"
import { AppBreadcrumb } from "./app-breadcrumb"
import { displayRole, initials } from "./user-info"

export function AppHeader({ config, actions }: { config: NavConfig; actions?: ReactNode }) {
  const { data: session } = useSession()
  const user = session?.user
  const name = user?.name || "กำลังโหลด..."
  const tutorOnly = isTutorOnlyRole(user?.role)
  const links = (config.userLinks ?? []).filter(
    (l) => (!l.staffOnly || isStaffRole(user?.role)) && !(l.hideForTutorOnly && tutorOnly),
  )

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger aria-label="เปิด/ปิดเมนู" className="-ml-1 size-10" />
      <Separator orientation="vertical" className="mr-2 data-[orientation=vertical]:h-4" />
      <AppBreadcrumb config={config} />

      <div className="ml-auto flex items-center gap-1">
        {actions}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-auto gap-2 px-2 py-1">
              <Avatar className="size-8">
                <AvatarImage src={user?.image ?? undefined} alt="" />
                <AvatarFallback>{initials(user?.name)}</AvatarFallback>
              </Avatar>
              <span className="hidden text-left leading-tight md:grid">
                <span className="text-sm font-semibold">{name}</span>
                <span className="text-xs font-normal text-muted-foreground">{displayRole(user?.role, config.roleFallback)}</span>
              </span>
              <ChevronDownIcon className="hidden text-muted-foreground md:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel className="grid leading-tight">
              <span className="truncate text-sm font-semibold">{name}</span>
              <span className="text-xs font-normal text-muted-foreground">{displayRole(user?.role, config.roleFallback)}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {links.length > 0 && (
              <>
                {links.map((l) => (
                  <DropdownMenuItem key={l.href} asChild>
                    <Link href={l.href}>
                      <l.icon />
                      {l.title}
                    </Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem variant="destructive" onSelect={() => signOut({ callbackUrl: "/login" })}>
              <LogOutIcon />
              ออกจากระบบ
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
