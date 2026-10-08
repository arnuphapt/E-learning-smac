# Product

<!-- impeccable:product-schema 1 -->

> Written from Dice's answers (2026-10-08) and the tutor-mode spec; not an interview. Inferred facts are marked (inferred).

## Platform

web

## Users
- Instructors / course managers / admins of a nursing college (Thai-language UI). They build content between classes on a desktop, sometimes check on a phone. Job: prepare a tutor set (video lessons + a per-lesson question bank), lock it to the right students, confirm it is ready.
- Students (nursing students) use the student side. Out of scope for this surface work.

## Product Purpose
E-learning-smac is a Next.js + Supabase LMS (courses, lessons, pre/post tests, worksheets, AI tutor). Tutor mode (`courses_all.kind = 'tutor'`) adds practice sets: each lesson has a video and its own question bank with free-text topics; a student attempt draws N questions (or the whole bank) with a per-set timer and gets topic-level strengths/weaknesses and teacher explanations. Success for the instructor side: a set can be created, filled, locked and checked without ever touching course-only features.

## Positioning
Tutor sets are a mode of the same app, not a separate product, but they behave differently from courses (no pre/post test, no worksheets, no scores table, fail-closed access).

## Operating Context
- Instructor writes: `courses_all`, `lessons`, `questions` (kind `tutor`), `tutor_topics`, `course_instructors`, via the Supabase client under RLS; files go to R2 via `/api/upload/presign`.
- Access lock = `year_level` + `section` + `access.allowedEmails`. A tutor set with NO lock is visible to NO student (fail closed). Course wording "no selection = every year" is wrong for tutor sets.
- Bank rules: a lesson with an empty bank, or fewer questions than its draw count, is not ready ("คลังไม่พอ"). Pass thresholds (60/70) are system-wide and not instructor-editable.

## Capabilities and Constraints
- Instructor tutor surface: `/i/tutor` (list + create), `/i/tutor/[id]` (workspace), `/i/lesson/[id]/bank` (bank). Normal course/lesson pages must not be the path for tutor sets and normal courses must behave exactly as before.
- No schema changes. No new dependencies. Student tutor pages stay as they are.
- Removed from tutor lessons: pre/post test, worksheets/assignments, scores. Kept: video, lesson documents, AI documents, section / main-instructor / year / email lock.

## Brand Commitments
Same app: keep the existing shell, sidebar, IBM Plex Sans Thai / Noto Serif Thai fonts and base components. Tutor mode gets its own accent, layout and wording so an instructor knows at a glance they are in tutor mode. Not a separate visual world.

## Product Principles
- Readiness first: the most important fact about a set is whether a student can use it (locked? bank enough? lesson published?).
- Say what happens: empty lock means nobody; draw count above bank size is a warning, not a surprise at exam time.
- Tutor vocabulary: ชุดติว, คลังข้อสอบ, ข้อต่อรอบ, หัวข้อ; not รายวิชา / ใบงาน / Pre-Post.

## Accessibility & Inclusion
Thai-first copy; body contrast at least 4.5:1; keyboard-operable controls (reorder by buttons, not drag only); works at phone width.
