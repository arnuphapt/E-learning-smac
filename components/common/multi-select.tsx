"use client"

import { CheckIcon, ChevronsUpDownIcon, XIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export type MultiSelectOption = {
  value: string
  /** Chip text and first line of the item. */
  label: string
  /** Second line of the item. */
  description?: string
}

/** Multi-select: popover list with search, selected options shown as removable chips. `id` goes on the trigger for the FormField label. */
export function MultiSelect({
  id,
  options,
  selectedValues,
  onChange,
  placeholder = "เลือก...",
  searchPlaceholder = "ค้นหา…",
  emptyText = "ไม่มีข้อมูล",
  unit = "รายการ",
}: {
  id: string
  options: MultiSelectOption[]
  selectedValues: string[]
  onChange: (values: string[]) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  /** Counter noun: "เลือกแล้ว N {unit}". */
  unit?: string
}) {
  const selected = options.filter((o) => selectedValues.includes(o.value))
  const toggle = (value: string) =>
    onChange(selectedValues.includes(value) ? selectedValues.filter((v) => v !== value) : [...selectedValues, value])

  return (
    <div className="grid gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button id={id} type="button" variant="outline" role="combobox" className="w-full justify-between font-normal">
            <span className={cn(selected.length === 0 && "text-muted-foreground")}>
              {selected.length === 0 ? placeholder : `เลือกแล้ว ${selected.length} ${unit}`}
            </span>
            <ChevronsUpDownIcon className="opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {options.map((o) => (
                  <CommandItem key={o.value} value={`${o.label} ${o.description ?? ""}`} onSelect={() => toggle(o.value)}>
                    <CheckIcon className={cn(!selectedValues.includes(o.value) && "opacity-0")} />
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-semibold">{o.label}</span>
                      {o.description && <span className="truncate text-xs text-muted-foreground">{o.description}</span>}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((o) => (
            <Badge key={o.value} variant="secondary" className="gap-1 pr-1">
              {o.label}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-4 rounded-full"
                aria-label={`เอา ${o.label} ออก`}
                onClick={() => toggle(o.value)}
              >
                <XIcon className="size-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
