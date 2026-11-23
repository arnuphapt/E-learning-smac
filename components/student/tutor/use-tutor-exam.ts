"use client"

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { useConfirm } from "@/components/common/confirm"
import {
  attemptActionUrl,
  attemptUrl,
  nextSeq,
  post,
  toExam,
  type AttemptPayload,
  type AttemptPreview,
  type ExamState,
  type SubmitResult,
  type TutorLessonInfo,
} from "./exam-types"

// Tutor exam of one lesson. Data from /api/tutor/lessons/<id>/attempt:
//   GET  -> question count + minutes (pre-start screen) and whether a round is already open
//   POST -> start or resume; the payload holds ONLY this student's locked questions (no answers / explanations)
// One clock for the whole round, counted down from the server's deadline_at (server time offset, no sessionStorage).
// Closing the page and coming back resumes the same round: the questions, their order and the deadline are all server-side.
// Answers: every click is saved on the server at once (/api/tutor/attempts/<attemptId>/answer; optimistic, a failed save rolls
// back to the last value the SERVER confirmed, with an error). A save gives up after SAVE_TIMEOUT_MS so submit (which waits for
// the save chain) can never hang on a stuck request. Every save carries a per-question seq (server-clock based, strictly
// increasing); the server ignores a write whose seq is not newer, so an aborted request that lands late cannot overwrite a
// newer answer. After an abort the page re-reads the answers from the server (RESYNC_DELAY_MS later) so the UI shows what the
// server really holds. Submit and time-up both call /submit; the server scores and returns only
// score + total; the full result (analysis + review) is on ./result.
const SAVE_TIMEOUT_MS = 10000
const RESYNC_DELAY_MS = 3000

export function useTutorExam(id: string | undefined) {
  const [info, setInfo] = useState<TutorLessonInfo | null>(null) // { set, lesson } for the title
  const [pre, setPre] = useState<AttemptPreview | null>(null) // GET preview
  const [exam, setExam] = useState<ExamState | null>(null)
  const [missing, setMissing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState("")
  const [nowMs, setNowMs] = useState(0)
  const [empty, setEmpty] = useState(false) // the locked questions no longer exist (deleted / retyped mid-round)
  const [result, setResult] = useState<SubmitResult | null>(null) // { status, score, total } once the attempt has ended
  const [saveError, setSaveError] = useState("")
  const [submitError, setSubmitError] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const saveChain = useRef<Promise<void>>(Promise.resolve()) // answer saves run one after another so the last click is the one stored
  const submitLock = useRef(false)
  const confirmed = useRef<Record<string, string | null | undefined>>({}) // question id -> the choice the server has confirmed saving (the rollback target)
  const seqRef = useRef(0) // last seq handed out: server-clock ms, bumped by 1 when two clicks share a millisecond
  const pending = useRef(0) // clicks whose save has not finished (a resync must not overwrite them)
  const confirm = useConfirm()

  useEffect(() => {
    if (!id) return
    let cancelled = false
    ;(async () => {
      try {
        const [lr, pr] = await Promise.all([
          fetch("/api/tutor/lessons/" + encodeURIComponent(id), { cache: "no-store" }),
          fetch(attemptUrl(id), { cache: "no-store" }),
        ])
        if (!lr.ok || !pr.ok) throw new Error("not available")
        const [lessonData, preview] = (await Promise.all([lr.json(), pr.json()])) as [TutorLessonInfo, AttemptPreview]
        if (cancelled) return
        setInfo(lessonData)
        if (preview.attempt && !preview.attempt.expired) {
          // a round is open: go straight back into it
          const rr = await post(id, { resume: true })
          if (cancelled) return
          if (rr.ok) {
            const d = (await rr.json()) as AttemptPayload
            confirmed.current = { ...d.answers }
            setExam(toExam(d))
            setNowMs(Date.now())
            return
          }
          const errBody = (await rr.json().catch(() => ({}))) as { state?: string }
          if (errBody.state === "empty") {
            if (!cancelled) setEmpty(true)
            return
          }
        }
        if (preview.attempt?.expired) setNotice("รอบก่อนหน้าหมดเวลาแล้ว ระบบนับเป็นการส่งคำตอบ" + (preview.canStart ? " คุณเริ่มรอบใหม่ได้" : ""))
        setPre(preview)
      } catch {
        if (!cancelled) setMissing(true)
      }
    })()
    return () => { cancelled = true }
  }, [id])

  const running = !!exam
  useEffect(() => {
    if (!running) return
    const t = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(t)
  }, [running])

  // time-up is derived from the same server-offset clock as the countdown
  const timeUp = !!exam && exam.deadlineMs - (nowMs + exam.offset) <= 0

  async function submit(manual: boolean) {
    if (!exam || submitLock.current || result) return
    if (manual) {
      const left = exam.questions.length - exam.questions.filter((x) => exam.answers[x.id] != null).length
      const ok = await confirm({
        title: "ส่งคำตอบ",
        desc: left > 0 ? "ยังมี " + left + " ข้อที่ไม่ได้ตอบ (นับเป็นผิด)" : undefined,
        message: "เมื่อส่งแล้วจะแก้คำตอบไม่ได้อีก ต้องการส่งใช่หรือไม่",
        confirmText: "ส่งคำตอบ",
      })
      if (!ok) return
    }
    submitLock.current = true
    setSubmitting(true)
    setSubmitError(false)
    try {
      await saveChain.current // let the last click reach the server before it is scored
      const r = await fetch(attemptActionUrl(exam.attempt.id, "submit"), { method: "POST" })
      if (!r.ok) throw new Error("submit failed")
      setResult((await r.json()) as SubmitResult)
    } catch {
      setSubmitError(true)
    } finally {
      submitLock.current = false
      setSubmitting(false)
    }
  }

  // auto-submit once when the clock runs out (a failed try shows a retry button, no loop)
  useEffect(() => {
    if (!timeUp) return
    const t = setTimeout(() => submit(false), 0) // from a callback, not the effect body
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeUp])

  // Re-read the answers the server holds (resume payload) and show them, unless a newer click is still being saved.
  async function resync() {
    if (!id) return
    try {
      const rr = await post(id, { resume: true })
      if (!rr.ok) return // ended / expired: the submit path or the next save shows it
      const d = (await rr.json()) as AttemptPayload
      if (pending.current > 0) return
      confirmed.current = { ...d.answers }
      setExam((e) => (e ? { ...e, answers: { ...d.answers } } : e))
    } catch { /* offline: the next save or reload re-syncs */ }
  }

  async function saveAnswer(qid: string, cid: string, seq: number) {
    if (!exam) return
    const ctl = new AbortController()
    const timer = setTimeout(() => ctl.abort(), SAVE_TIMEOUT_MS)
    try {
      const r = await fetch(attemptActionUrl(exam.attempt.id, "answer"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: qid, chosen: cid, seq }),
        signal: ctl.signal,
      })
      if (r.status === 409) {
        const d = (await r.json().catch(() => ({}))) as Partial<SubmitResult> & { state?: string }
        if (d.state === "ended") { setResult(d as SubmitResult); return } // the deadline passed under us: the server already ended + scored it
      }
      if (!r.ok) throw new Error("save failed")
      const d = (await r.json().catch(() => ({}))) as { applied?: boolean }
      if (d.applied === false) setTimeout(resync, 0) // the server already holds a newer answer for this question
      else confirmed.current[qid] = cid
    } catch (err: unknown) {
      // roll back to what the server last confirmed (not the previous click, which may itself have failed), unless a
      // newer click on the same question has already replaced this one
      setExam((e) => {
        if (!e || e.answers[qid] !== cid) return e
        const answers = { ...e.answers }
        const ok = confirmed.current[qid]
        if (ok == null) delete answers[qid]; else answers[qid] = ok
        return { ...e, answers }
      })
      setSaveError("บันทึกคำตอบไม่สำเร็จ กรุณาเลือกใหม่อีกครั้ง")
      // ponytail: an aborted request can still commit AFTER the resync read (server slower than RESYNC_DELAY_MS + the abort);
      // the seq stops it overwriting a newer click but not from being the newest one. Upgrade: poll the resume payload until
      // it is stable, or make the server reject writes older than the request's own timeout.
      if (err !== null && typeof err === "object" && "name" in err && (err as { name?: unknown }).name === "AbortError") {
        setTimeout(resync, RESYNC_DELAY_MS)
      }
    } finally {
      clearTimeout(timer)
      pending.current -= 1
    }
  }

  function choose(qid: string, cid: string) {
    if (!exam || timeUp || result || exam.answers[qid] === cid) return
    setSaveError("")
    setExam((e) => (e ? { ...e, answers: { ...e.answers, [qid]: cid } } : e))
    const seq = (seqRef.current = nextSeq(seqRef.current, exam.offset))
    pending.current += 1
    saveChain.current = saveChain.current.then(() => saveAnswer(qid, cid, seq))
  }

  async function start() {
    if (!id) return
    setBusy(true)
    try {
      const r = await post(id, {})
      const d = (await r.json().catch(() => ({}))) as Partial<AttemptPayload> & { state?: string }
      if (!r.ok) {
        if (d.state === "empty") setEmpty(true)
        else if (d.state === "limit") setPre((p) => (p ? { ...p, canStart: false } : p)) // the limit was used up since this page loaded
        else toast.error("เริ่มทำข้อสอบไม่สำเร็จ กรุณาลองใหม่")
        return
      }
      const payload = d as AttemptPayload
      confirmed.current = { ...payload.answers }
      setExam(toExam(payload))
      setNowMs(Date.now())
    } catch {
      toast.error("เริ่มทำข้อสอบไม่สำเร็จ กรุณาลองใหม่")
    } finally {
      setBusy(false)
    }
  }

  const go = (i: number) => setExam((e) => (e ? { ...e, cur: i } : e))
  const remaining = exam ? Math.max(0, Math.ceil((exam.deadlineMs - (nowMs + exam.offset)) / 1000)) : 0

  return { info, pre, exam, missing, empty, busy, notice, result, saveError, submitError, submitting, timeUp, remaining, submit, choose, start, go }
}
