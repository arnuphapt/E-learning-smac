import type { LucideIcon } from "lucide-react"

export type NavLeaf = {
  title: string
  href: string
  icon: LucideIcon
  /** Permission from PERMISSIONS (lib/rbac.ts). Omitted = every signed-in user. */
  permission?: string
  /**
   * Dynamic routes owned by this entry: they keep it highlighted and sit under it in the breadcrumb.
   * `[id]` = one segment, a trailing `/**` = this path and everything below it.
   */
  match?: readonly string[]
  /** Only read when `NavConfig.restrictTutorOnly` is set: tutor-only (external-domain) users see just the entries marked true. */
  tutorOk?: boolean
}

export type NavItem = Omit<NavLeaf, "href"> & {
  /** A link item has `href`; an item with `items` is a collapsible submenu and has no link of its own. */
  href?: string
  items?: readonly NavLeaf[]
}

export type NavGroup = { label: string; items: readonly NavItem[] }

/** Link in the header's user menu. */
export type NavUserLink = {
  title: string
  href: string
  icon: LucideIcon
  /** Only staff roles (admin, instructor, course_manager) see it. */
  staffOnly?: boolean
  /** Hidden from tutor-only users. */
  hideForTutorOnly?: boolean
}

export type NavConfig = {
  /** Shell identity: brand subtitle and where the logo links. */
  subtitle: string
  homeHref: string
  /** Role label shown when the session carries no role. */
  roleFallback?: string
  /** Primary button under the logo, shown when the user holds `permission`. */
  quickAction?: NavLeaf
  /** Extra links in the header's user menu, above "ออกจากระบบ". */
  userLinks?: readonly NavUserLink[]
  /** Tutor-only users only see entries with `tutorOk` (student shell). */
  restrictTutorOnly?: boolean
  groups: readonly NavGroup[]
  /** Page routes that only redirect and so need no menu entry. */
  redirects?: readonly string[]
}

export type NavCrumb = { title: string; href?: string }
