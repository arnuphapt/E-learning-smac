"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { ChevronRightIcon, GraduationCapIcon, LogOutIcon } from "lucide-react"
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
import { isTutorOnlyRole } from "@/lib/roles"
import { hasPermission } from "@/lib/rbac"
import { resolveNav } from "@/lib/nav/match"
import type { NavConfig, NavGroup, NavItem, NavLeaf } from "@/lib/nav/types"
import { displayRole, initials } from "./user-info"

type User = (Parameters<typeof hasPermission>[0] & { role?: string | null }) | undefined

const activeItemClass =
  "relative data-[active=true]:bg-sidebar-primary/45 data-[active=true]:font-semibold data-[active=true]:text-white data-[active=true]:hover:bg-sidebar-primary/50 data-[active=true]:before:absolute data-[active=true]:before:inset-y-1.5 data-[active=true]:before:left-0 data-[active=true]:before:w-[3px] data-[active=true]:before:rounded-full data-[active=true]:before:bg-sidebar-ring"

/** Drop entries the user may not see; empty submenus and groups go too. */
function visibleGroups(config: NavConfig, user: User): NavGroup[] {
  const tutorOnly = !!config.restrictTutorOnly && isTutorOnlyRole(user?.role)
  const allowed = (e: { permission?: string; tutorOk?: boolean }) =>
    (!e.permission || hasPermission(user, e.permission)) && (!tutorOnly || !!e.tutorOk)
  return config.groups
    .map((g) => ({
      ...g,
      items: g.items
        .filter(allowed)
        .map((i): NavItem => (i.items ? { ...i, items: i.items.filter(allowed) } : i))
        .filter((i) => !i.items || i.items.length > 0),
    }))
    .filter((g) => g.items.length > 0)
}

export function AppSidebar({ config }: { config: NavConfig }) {
  const { data: session } = useSession()
  const pathname = usePathname() || ""
  const { setOpenMobile } = useSidebar()
  const user = session?.user
  const activeHref = resolveNav(config, pathname)?.leaf.href
  const close = () => setOpenMobile(false)
  const { subtitle, quickAction } = config
  // tutor-only users have a single entry; the logo takes them straight there
  const homeHref = config.restrictTutorOnly && isTutorOnlyRole(user?.role) ? "/s/tutor" : config.homeHref

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
                  <span className="truncate text-xs text-sidebar-foreground/75">{subtitle}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {quickAction && (!quickAction.permission || hasPermission(user, quickAction.permission)) && (
          <div className="px-2 group-data-[collapsible=icon]:px-0">
            <Button asChild className="w-full group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:p-0">
              <Link href={quickAction.href} onClick={close} aria-label={quickAction.title}>
                <quickAction.icon />
                <span className="group-data-[collapsible=icon]:hidden">{quickAction.title}</span>
              </Link>
            </Button>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="sidebar-scroll">
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
                              <SidebarMenuSubButton asChild isActive={sub.href === activeHref} className={activeItemClass}>
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
                    <SidebarMenuButton asChild tooltip={item.title} isActive={item.href === activeHref} className={activeItemClass}>
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
                <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground">{initials(user?.name)}</AvatarFallback>
              </Avatar>
              <div className="grid min-w-0 flex-1 leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate text-sm font-semibold">{user?.name || "กำลังโหลด..."}</span>
                <span className="truncate text-xs text-sidebar-foreground/75">{displayRole(user?.role, config.roleFallback)}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="ออกจากระบบ"
                className="text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-sidebar-ring group-data-[collapsible=icon]:hidden"
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
