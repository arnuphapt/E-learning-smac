"use client"

import { Fragment } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { buildCrumbs } from "@/lib/nav/match"
import type { NavConfig } from "@/lib/nav/types"

/** Group > item > page, built from the nav config; dynamic routes get their parent entry plus "รายละเอียด". */
export function AppBreadcrumb({ config }: { config: NavConfig }) {
  const crumbs = buildCrumbs(config, usePathname() || "")
  if (crumbs.length === 0) return null
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1
          return (
            <Fragment key={i}>
              {i > 0 && <BreadcrumbSeparator className={i > 1 ? undefined : "hidden sm:block"} />}
              <BreadcrumbItem className={!last && i < crumbs.length - 2 ? "hidden sm:block" : undefined}>
                {last ? (
                  <BreadcrumbPage>{c.title}</BreadcrumbPage>
                ) : c.href ? (
                  <BreadcrumbLink asChild>
                    <Link href={c.href}>{c.title}</Link>
                  </BreadcrumbLink>
                ) : (
                  <span>{c.title}</span>
                )}
              </BreadcrumbItem>
            </Fragment>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
