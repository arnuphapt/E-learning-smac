"use client"

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Pagination as PaginationRoot,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from "@/components/ui/pagination"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useDataTable } from "./context"
import { getPageNumbers } from "./helpers"

export function Pagination({ pageSizes = [10, 20, 50, 100] }: { pageSizes?: readonly number[] }) {
  const table = useDataTable()
  const { pageIndex, pageSize } = table.state.pagination
  const total = table.getRowCount()
  if (total === 0) return null

  const pageCount = Math.max(1, table.getPageCount())
  const page = Math.min(pageIndex + 1, pageCount)
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  const sizes = pageSizes.includes(pageSize) ? pageSizes : [...pageSizes, pageSize].sort((a, b) => a - b)

  return (
    <div className="flex flex-col gap-3 border-t border-border/60 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <span className="text-sm text-muted-foreground">
        แสดง <strong className="font-semibold text-foreground tabular-nums">{from}–{to}</strong> จาก{" "}
        <strong className="font-semibold text-foreground tabular-nums">{total}</strong> รายการ
      </span>
      <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end sm:gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>แถวต่อหน้า</span>
          <Select value={String(pageSize)} onValueChange={(v) => table.setPageSize(Number(v))}>
            <SelectTrigger size="sm" aria-label="จำนวนแถวต่อหน้า" className="h-8 w-20 bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sizes.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {pageCount > 1 && (
          <PaginationRoot aria-label="การแบ่งหน้า" className="mx-0 w-auto">
            <PaginationContent>
              <PaginationItem>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="หน้าก่อนหน้า"
                  disabled={!table.getCanPreviousPage()}
                  onClick={() => table.previousPage()}
                >
                  <ChevronLeftIcon />
                  <span className="hidden sm:inline">ก่อนหน้า</span>
                </Button>
              </PaginationItem>
              <PaginationItem className="sm:hidden">
                <span className="px-2 text-xs font-medium text-muted-foreground tabular-nums">
                  หน้า {page} / {pageCount}
                </span>
              </PaginationItem>
              {getPageNumbers(page, pageCount).map((p, i) => (
                <PaginationItem key={p === "ellipsis" ? `e${i}` : p} className="hidden sm:inline-flex">
                  {p === "ellipsis" ? (
                    <PaginationEllipsis />
                  ) : (
                    <Button
                      variant={p === page ? "default" : "ghost"}
                      size="icon-sm"
                      aria-label={`หน้า ${p}`}
                      aria-current={p === page ? "page" : undefined}
                      onClick={() => table.setPageIndex(p - 1)}
                    >
                      {p}
                    </Button>
                  )}
                </PaginationItem>
              ))}
              <PaginationItem>
                <Button
                  variant="ghost"
                  size="sm"
                  aria-label="หน้าถัดไป"
                  disabled={!table.getCanNextPage()}
                  onClick={() => table.nextPage()}
                >
                  <span className="hidden sm:inline">ถัดไป</span>
                  <ChevronRightIcon />
                </Button>
              </PaginationItem>
            </PaginationContent>
          </PaginationRoot>
        )}
      </div>
    </div>
  )
}
