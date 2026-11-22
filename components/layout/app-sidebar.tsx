"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { ChevronRightIcon, GraduationCapIcon, LogOutIcon, PlusIcon } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { hasPermission, PERMISSIONS } from "@/lib/rbac"
import { resolveNav } from "@/lib/nav/match"
import type { NavConfig, NavGroup, NavItem, NavLeaf } from "@/lib/nav/types"
import { displayRole, initials } from "./user-info"

type User = Parameters<typeof hasPermission>[0]

const allowed = (user: User, permission?: string) => !permission || hasPermission(user, permission)

/** Drop entries the user may not see; empty submenus and groups go too. */
function visibleGroups(config: NavConfig, user: User): NavGroup[] {
  return config.groups
    .map((g) => ({
      ...g,
      items: g.items
        .filter((i) => allowed(user, i.permission))
        .map((i): NavItem => (i.items ? { ...i, items: i.items.filter((s) => allowed(user, s.permission)) } : i))
        .filter((i) => !i.items || i.items.length > 0),
    }))
    .filter((g) => g.items.length > 0)
}

export function AppSidebar({ config, subtitle = "พื้นที่อาจารย์ผู้สอน", homeHref = "/i/courses" }: { config: NavConfig; subtitle?: string; homeHref?: string }) {
  const { data: session } = useSession()
  const pathname = usePathname() || ""
  const { setOpenMobile } = useSidebar()
  const user = session?.user
  const activeHref = resolveNav(config, pathname)?.leaf.href
  const close = () => setOpenMobile(false)

  const leafLink = (leaf: NavLeaf) => (
    <Link href={leaf.href} onClick={close}>
      <leaf.icon />
      <span>{leaf.title}</span>
    </Link>
  )

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href={homeHref} onClick={close}>
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <GraduationCapIcon className="size-4" />
                </div>
                <div className="grid flex-1 text-left leading-tight">
                  <span className="truncate font-semibold">E-learning</span>
                  <span className="truncate text-xs text-muted-foreground">{subtitle}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {hasPermission(user, PERMISSIONS.COURSES_CREATE) && (
          <Button asChild className="group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-0">
            <Link href="/i/course/new" onClick={close} aria-label="สร้างรายวิชา">
              <PlusIcon />
              <span className="group-data-[collapsible=icon]:hidden">สร้างรายวิชา</span>
            </Link>
          </Button>
        )}
      </SidebarHeader>

      <SidebarContent>
        {visibleGroups(config, user).map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarMenu>
              {group.items.map((item) =>
                item.items ? (
                  <Collapsible
                    key={item.title}
                    asChild
                    defaultOpen={item.items.some((s) => s.href === activeHref)}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip={item.title}>
                          <item.icon />
                          <span>{item.title}</span>
                          <ChevronRightIcon className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {item.items.map((sub) => (
                            <SidebarMenuSubItem key={sub.href}>
                              <SidebarMenuSubButton asChild isActive={sub.href === activeHref}>
                                <Link href={sub.href} onClick={close}>
                                  <span>{sub.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                ) : (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild tooltip={item.title} isActive={item.href === activeHref}>
                      {leafLink(item as NavLeaf)}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ),
              )}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2 p-2">
              <Avatar className="size-8">
                <AvatarImage src={user?.image ?? undefined} alt="" />
                <AvatarFallback>{initials(user?.name)}</AvatarFallback>
              </Avatar>
              <div className="grid min-w-0 flex-1 leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate text-sm font-semibold">{user?.name || "กำลังโหลด..."}</span>
                <span className="truncate text-xs text-muted-foreground">{displayRole(user?.role)}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="ออกจากระบบ"
                className="group-data-[collapsible=icon]:hidden"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                <LogOutIcon />
              </Button>
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
