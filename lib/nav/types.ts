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
}

export type NavItem = Omit<NavLeaf, "href"> & {
  /** A link item has `href`; an item with `items` is a collapsible submenu and has no link of its own. */
  href?: string
  items?: readonly NavLeaf[]
}

export type NavGroup = { label: string; items: readonly NavItem[] }

export type NavConfig = {
  groups: readonly NavGroup[]
  /** Page routes that only redirect and so need no menu entry. */
  redirects?: readonly string[]
}

export type NavCrumb = { title: string; href?: string }
