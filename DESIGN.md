# E-learning-smac design system

Nursing college LMS (student, tutor, instructor). The UI is stock shadcn/ui, new-york style, neutral theme, Tailwind v4. The rules live in `.claude/rules/ui-architecture.md`; this file is the short map.

## Theme

- Tokens are in `app/globals.css`: Clean Flat teal theme (oklch) with `#0d6e8c` primary, `#f1f5f9` canvas, `#ffffff` cards, `#0f172a` ink, plus semantic `success`, `warning`, `info` (each with `-soft`), `primary-soft`, and `amber-accent` (`--accent-amber` for scores, rewards, and due-soon highlights). No raw hex in components.
- Separation relies on 1px `--border` and background tints; subtle single-layer shadows (`--shadow-xs`..`--shadow-lg`) are reserved for floating layers. Moderate radius: `8px` controls (`--radius`), `12px` cards (`rounded-xl`).
- Fonts: IBM Plex Sans Thai / IBM Plex Sans (`font-sans`), Noto Serif Thai (`font-serif`, headings), IBM Plex Mono (`font-mono`), loaded in `app/layout.tsx`. Dark tokens are kept consistent though no theme switch is wired.

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
