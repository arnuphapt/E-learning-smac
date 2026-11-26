import { cloneElement, isValidElement, type ReactNode } from "react"
import { Field, FieldDescription, FieldError } from "@/components/ui/field"
import { Label } from "@/components/ui/label"

/** Label + control + description + error. `htmlFor` must equal the control's `id`. */
export function FormField({
  label,
  htmlFor,
  description,
  error,
  required,
  children,
  className,
}: {
  label: ReactNode
  htmlFor: string
  description?: ReactNode
  error?: ReactNode
  required?: boolean
  children: ReactNode
  className?: string
}) {
  const errorId = error ? `${htmlFor}-error` : undefined
  const control =
    errorId && isValidElement<Record<string, unknown>>(children)
      ? cloneElement(children, {
          "aria-invalid": true,
          "aria-describedby": [children.props["aria-describedby"], errorId].filter(Boolean).join(" ") || undefined,
        })
      : children

  return (
    <Field className={className} data-invalid={error ? true : undefined}>
      <Label htmlFor={htmlFor}>
        {label}
        {required && (
          <span aria-hidden className="text-destructive">
            *
          </span>
        )}
      </Label>
      {control}
      {description && <FieldDescription>{description}</FieldDescription>}
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </Field>
  )
}
