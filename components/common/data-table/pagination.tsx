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
    <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
      <span className="text-sm text-muted-foreground">
        {from}–{to} จาก {total} รายการ
      </span>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>แสดง</span>
          <Select value={String(pageSize)} onValueChange={(v) => table.setPageSize(Number(v))}>
            <SelectTrigger size="sm" aria-label="จำนวนรายการต่อหน้า" className="w-20">
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
                  size="icon"
                  aria-label="หน้าก่อนหน้า"
                  disabled={!table.getCanPreviousPage()}
                  onClick={() => table.previousPage()}
                >
                  <ChevronLeftIcon />
                </Button>
              </PaginationItem>
              {getPageNumbers(page, pageCount).map((p, i) => (
                <PaginationItem key={p === "ellipsis" ? `e${i}` : p}>
                  {p === "ellipsis" ? (
                    <PaginationEllipsis />
                  ) : (
                    <Button
                      variant={p === page ? "default" : "ghost"}
                      size="icon"
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
                  size="icon"
                  aria-label="หน้าถัดไป"
                  disabled={!table.getCanNextPage()}
                  onClick={() => table.nextPage()}
                >
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
