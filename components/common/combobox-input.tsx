"use client"

import { useState } from "react"
import { CheckIcon, ChevronsUpDownIcon, PlusIcon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

/** Combobox backed by Popover + Command: pick an existing option or type custom free text. */
export function ComboboxInput({
  id,
  value,
  onChange,
  options,
  placeholder = "เลือกหรือพิมพ์ข้อความ…",
  searchPlaceholder = "ค้นหาหรือพิมพ์ใหม่…",
  emptyText = "ไม่พบรายการ",
  clearable = true,
  disabled,
  className,
}: {
  id?: string
  value: string
  onChange: (value: string) => void
  options: readonly string[]
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  clearable?: boolean
  disabled?: boolean
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const trimmedQuery = query.trim()
  const hasExactMatch = trimmedQuery.length > 0 && options.some((o) => o.toLowerCase() === trimmedQuery.toLowerCase())

  const selectValue = (next: string) => {
    onChange(next)
    setQuery("")
    setOpen(false)
  }

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) setQuery("")
        }}
      >
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn("w-full flex-1 justify-between px-3 font-normal", !value && "text-muted-foreground")}
          >
            <span className="truncate">{value || placeholder}</span>
            <ChevronsUpDownIcon className="size-4 shrink-0 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-(--radix-popover-trigger-width) p-0">
          <Command>
            <CommandInput value={query} onValueChange={setQuery} placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{trimmedQuery ? null : emptyText}</CommandEmpty>
              {trimmedQuery && !hasExactMatch && (
                <CommandGroup heading="ใช้ข้อความที่พิมพ์">
                  <CommandItem value={`__custom__:${trimmedQuery}`} onSelect={() => selectValue(trimmedQuery)}>
                    <PlusIcon className="size-4 text-primary" />
                    <span>ใช้ “{trimmedQuery}”</span>
                  </CommandItem>
                </CommandGroup>
              )}
              {options.length > 0 && (
                <CommandGroup>
                  {options.map((opt) => (
                    <CommandItem key={opt} value={opt} onSelect={() => selectValue(opt)}>
                      <CheckIcon className={cn("size-4", value === opt ? "opacity-100" : "opacity-0")} />
                      <span className="truncate">{opt}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {clearable && value && !disabled && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-9 shrink-0 text-muted-foreground"
          aria-label="ล้างค่า"
          onClick={() => onChange("")}
        >
          <XIcon className="size-4" />
        </Button>
      )}
    </div>
  )
}
