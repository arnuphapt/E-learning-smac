---
version: 1
slug: "app-i-tutor-page-jsx"
primary_target: "app/i/tutor/page.jsx"
related_targets: ["app/i/tutor/[id]/page.jsx","app/i/lesson/[id]/bank/page.jsx"]
---

# Surface brief: instructor tutor workspace

Scope and mode: Operate. Routes /i/tutor, /i/tutor/[id], /i/lesson/[id]/bank. Instructor only.
Task: create a tutor set, add lessons with video, fill each lesson's question bank, lock the set to students, see at a glance what is not ready. Constraints and truth: PRODUCT.md.
Unresolved: none blocking. Drag reorder dropped for up/down buttons (keyboard + phone).

## Direction contract

THESIS: a tutor set is a readiness board, not a course editor. One page: set header with lock + readiness, a lesson rail where every lesson shows its bank health, and a lesson panel with video, bank and documents stacked. Refuses the course editor's tab-of-forms and tabs for pre/post/worksheets.
OWN-WORLD: same shell, fonts and base components. Inside `.tutor` the accent switches from teal to indigo ink (--primary #4338a8, soft #ebe9f8), surface is a faint lavender grey, the set header is a deep indigo band (#231c63) with a serif Thai title and white text, counts and codes in tabular/mono, readiness uses the existing success/warning tokens. No gradients, no cards inside cards: lesson rail and panel are flat sections divided by hairlines.
STORY: the instructor lands, sees the set is indigo "ชุดติว", reads the one-line readiness (N students can enter, M of K lessons ready), fixes the first warning in place.
FIRST VIEWPORT: header band top (title, code, counts, lock chip right); below it two columns: lesson rail left (320px), selected lesson panel right; primary action "เพิ่มบทเรียน" top of the rail. On phone the rail becomes a stacked list above the panel.
FORM: master-detail workspace; seed key n/a (direction supplied by Dice's brief, no concept roll).
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
