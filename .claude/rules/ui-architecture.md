# UI architecture (shadcn/ui)

Decided 2026-11-22 (Dice). Modelled on E-seed/staff. Applies to every `.tsx` under `app/` and `components/`.

## Where components live

All component files live under `components/`. `app/**` holds route files only (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `route.ts`); no other component files under `app/`.

| Folder | Holds | Rule |
|---|---|---|
| `components/ui/` | stock shadcn primitives (added with `npx shadcn@latest add`) | never edit by hand; build variants one level up |
| `components/common/` | cross-feature building blocks: `data-table/`, `page-header`, `confirm`, `status-badge`, `states` (loading / empty / error), `form-field` | used by 2+ features |
| `components/layout/` | app shell: `app-sidebar`, `app-header`, `app-breadcrumb`, impersonation banner | one shell for instructor, one for student |
| `components/<feature>/` | feature parts: `course/`, `lesson/`, `tutor/`, `live/`, `assignment/`, `ai/`, `master/<entity>/`, `student/` | used inside one feature |

Promote a piece of JSX to a component the moment it appears twice. Shared by two features → `components/common/`.

## No native elements

Outside `components/ui/`, never render native `<button>`, `<input>`, `<select>`, `<textarea>`, `<table>`, `<dialog>`, `<progress>`. Use the shadcn primitive (`Button`, `Input`, `Select`, `Textarea`, `Table`, `Dialog`/`AlertDialog`/`Sheet`, `Progress`) or a `components/common/` block. ESLint enforces this (`no-restricted-syntax`).

The old hand-written UI (PascalCase `components/ui/*.jsx`, `dialog-focus.js`, the legacy CSS layer in `app/globals.css`, `app/landing.css`) is deleted. ESLint (`no-restricted-imports`) blocks the old paths; never bring it back.

## Data tables

Every tabular list (rows × columns: search, filter, sort, paginate) uses the compound `DataTable`. Card grids and short stacked lists (course cards, lesson rows, announcement cards, tutor sets) map a shared card component from `components/<feature>/` instead from `@/components/common/data-table` (TanStack Table + shadcn Table):

```tsx
<DataTable.Root data={rows} columns={columns}>
  <DataTable.Toolbar>
    <DataTable.Search placeholder="ค้นหา…" />
    <DataTable.Filter column="status" options={statusOptions} />
    <DataTable.Actions>{/* header buttons */}</DataTable.Actions>
  </DataTable.Toolbar>
  <DataTable.Content empty={<EmptyState … />} />
  <DataTable.Pagination />
</DataTable.Root>
```

Never build a list from `Table` primitives by hand, and never write a second table component.

## Navigation

The menu is data: `lib/nav/instructor.ts` and `lib/nav/student.ts` define groups → items → sub-items with icon, href, permission, and the route patterns that keep an item active. The sidebar, the mobile menu, and the breadcrumb all render from that config.

- Every static page route must appear in its nav config, as an item or a sub-item. A page reachable only by clicking through another page is a bug.
- Every dynamic route (`[id]`) names its parent item in the config, so the parent stays highlighted and the breadcrumb is built from it.
- `tests/nav-coverage.test.mjs` fails when a page route is missing from the config.

## Styling

- Tailwind utilities + shadcn semantic tokens (`bg-background`, `text-muted-foreground`, `bg-card`, `text-destructive`, …). shadcn default theme (neutral). No raw hex colors.
- Conditional classes through `cn()` from `@/lib/utils`.
- Inline `style` only for computed dynamic values (widths, canvas / pixi positions).
- Icons: `lucide-react` only. No emoji as icons.
- Accessibility: every input has a `Label`; icon-only buttons have `aria-label`; modals use `Dialog` / `AlertDialog` / `Sheet`; color is never the only signal.

## File size

No `.ts` / `.tsx` file over 1000 lines. Split oversized pages into `components/<feature>/` parts when you touch them.
