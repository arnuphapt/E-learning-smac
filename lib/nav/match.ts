// Pure route matching for the nav config. Erasable TS only: tests import this directly with node.
import type { NavConfig, NavCrumb, NavItem, NavLeaf } from "./types.ts"

/** `/i/lesson/[id]/**` -> regexp. `[x]` is one segment; a trailing `/**` also matches the bare path. */
export function patternToRegExp(pattern: string): RegExp {
  const deep = pattern.endsWith("/**")
  const base = deep ? pattern.slice(0, -3) : pattern
  const body = base
    .split("/")
    .map((seg) => (/^\[.+\]$/.test(seg) ? "[^/]+" : seg.replace(/[.*+?^${}()|\\]/g, "\\$&")))
    .join("/")
  return new RegExp(`^${body}${deep ? "(?:/.*)?" : ""}/?$`)
}

export type FlatEntry = { group: string; item: NavItem; leaf: NavLeaf }

/** Every linkable entry (an item with href, or a sub-item) with its group and parent item. */
export function flattenNav(config: NavConfig): FlatEntry[] {
  const out: FlatEntry[] = []
  for (const g of config.groups)
    for (const item of g.items) {
      if (item.items) for (const sub of item.items) out.push({ group: g.label, item, leaf: sub })
      else if (item.href) out.push({ group: g.label, item, leaf: item as NavLeaf })
    }
  return out
}

export type NavMatch = FlatEntry & { exact: boolean }

/** Entry that owns `pathname`: exact href first, else the most specific `match` pattern. */
export function resolveNav(config: NavConfig, pathname: string): NavMatch | null {
  const path = pathname.length > 1 ? pathname.replace(/\/$/, "") : pathname
  const flat = flattenNav(config)
  const exact = flat.find((e) => e.leaf.href === path)
  if (exact) return { ...exact, exact: true }
  let best: { entry: FlatEntry; len: number } | null = null
  for (const entry of flat)
    for (const pattern of entry.leaf.match ?? [])
      if (patternToRegExp(pattern).test(path) && (!best || pattern.length > best.len)) best = { entry, len: pattern.length }
  return best ? { ...best.entry, exact: false } : null
}

export function buildCrumbs(config: NavConfig, pathname: string, detailLabel = "รายละเอียด"): NavCrumb[] {
  const hit = resolveNav(config, pathname)
  if (!hit) return []
  const crumbs: NavCrumb[] = [{ title: hit.group }]
  if (hit.item.items) crumbs.push({ title: hit.item.title })
  if (hit.exact) crumbs.push({ title: hit.leaf.title })
  else crumbs.push({ title: hit.leaf.title, href: hit.leaf.href }, { title: detailLabel })
  return crumbs
}
