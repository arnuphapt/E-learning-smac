# E-learning-smac design system

Nursing college LMS (student, tutor, instructor). The UI is stock shadcn/ui, new-york style, neutral theme, Tailwind v4. The rules live in `.claude/rules/ui-architecture.md`; this file is the short map.

## Theme

- Tokens are in `app/globals.css`: the stock shadcn neutral set (oklch) plus extra semantic tokens `success`, `warning`, `info` (each with `-soft`) and `primary-soft`. No raw hex in components.
- Fonts: IBM Plex Sans Thai / IBM Plex Sans (`font-sans`), Noto Serif Thai (`font-serif`, landing headings), IBM Plex Mono (`font-mono`). Loaded in `app/layout.tsx`.
- Dark tokens exist but no theme switch is wired.

## Layout of the code

- `components/ui/`: stock shadcn primitives, added with `npx shadcn@latest add`, never hand-edited.
- `components/common/`: cross-feature blocks (`data-table/`, `page-header`, `page-container`, `confirm`, `status-badge`, `states`, `form-field`, `multi-select`).
- `components/layout/`: app shell (sidebar, header, breadcrumb).
- `components/<feature>/`: feature parts (`course`, `lesson`, `tutor`, `live`, `grading`, `ai`, `master/<entity>`, `student`, `landing`).
- `app/` holds routes only. Page files stay thin: data loading and composition.

## Conventions

- Lists use the compound `DataTable` (`DataTable.Root / Toolbar / Content / Pagination`); master-data pages use `MasterListPage`.
- Forms: `FormField` + shadcn controls, create/edit in `Dialog` or `Sheet`; confirmations through `useConfirm`; feedback through `sonner` `toast`; loading / empty / error through `components/common/states`.
- Navigation is data: `lib/nav/instructor.ts`, `lib/nav/student.ts`. Every page route must be in the config (`tests/nav-coverage.test.mjs`).
- No native `button`, `input`, `select`, `textarea`, `table`, `dialog`, `progress` outside `components/ui/`; no old UI imports; no file over 1000 lines. All three are ESLint errors.
- Icons: `lucide-react`. Conditional classes: `cn()` from `@/lib/utils`.
- Accessibility: visible `Label` for every input, `aria-label` on icon-only buttons.
