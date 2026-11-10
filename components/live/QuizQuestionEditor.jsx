"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { TIME_LIMITS, CHOICE_STYLES } from "@/lib/live";
import Icon from "@/components/ui/Icon";
import { Select } from "@/components/ui/Primitives";
import { ChoiceIcon } from "@/components/live/ChoiceIcon";

export default function QuizQuestionEditor({
  question,
  index,
  total,
  problems = [],
  onSaveQuestion,
  onDeleteQuestion,
  onMoveQuestion,
}) {
  const [text, setText] = useState(question.text || "");
  const [choices, setChoices] = useState(
    Array.isArray(question.choices) && question.choices.length > 0
      ? question.choices
      : [
          { id: "a", text: "" },
          { id: "b", text: "" },
        ]
  );
  const [answer, setAnswer] = useState(question.answer || "");
  const [timeLimitSec, setTimeLimitSec] = useState(question.time_limit_sec || 20);

  // Autosave status: 'idle' | 'saving' | 'saved' | 'error'
  const [saveStatus, setSaveStatus] = useState("saved");
  const [moving, setMoving] = useState(false);
  const debounceTimerRef = useRef(null);
  const mountedRef = useRef(false);
  const pendingSaveRef = useRef(null);
  const savingRef = useRef(null);
  const syncedIdRef = useRef(question.id);

  // Reordering or an older save response must not replace a local draft.
  useEffect(() => {
    if (syncedIdRef.current === question.id && pendingSaveRef.current) return;
    if (syncedIdRef.current !== question.id) {
      clearTimeout(debounceTimerRef.current);
      pendingSaveRef.current = null;
      syncedIdRef.current = question.id;
    }
    setText(question.text || "");
    setChoices(
      Array.isArray(question.choices) && question.choices.length > 0
        ? question.choices
        : [
            { id: "a", text: "" },
            { id: "b", text: "" },
          ]
    );
    setAnswer(question.answer || "");
    setTimeLimitSec(question.time_limit_sec || 20);
  }, [question.id, question.text, question.choices, question.answer, question.time_limit_sec]);

  const flushSave = useCallback(async () => {
    clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = null;
    // Serialize saves so an older write cannot finish after a newer draft.
    while (savingRef.current) await savingRef.current;
    const draft = pendingSaveRef.current;
    if (!draft) return true;

    const saving = (async () => {
      let success = false;
      try {
        success = await onSaveQuestion(draft);
      } catch (err) {
        console.error("Autosave error:", err);
      }
      if (pendingSaveRef.current === draft) {
        if (success) pendingSaveRef.current = null;
        if (mountedRef.current) setSaveStatus(success ? "saved" : "error");
      }
      return success;
    })();
    savingRef.current = saving;
    const success = await saving;
    if (savingRef.current === saving) savingRef.current = null;
    return success;
  }, [onSaveQuestion]);

  // Debounced save
  const triggerDebouncedSave = useCallback(
    (updatedFields) => {
      setSaveStatus("saving");
      pendingSaveRef.current = { id: question.id, ...updatedFields };
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(flushSave, 600);
    },
    [question.id, flushSave]
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      void flushSave();
    };
  }, [flushSave]);

  const handleMove = async (toIndex) => {
    if (moving) return;
    setMoving(true);
    try {
      // Drain any edits made while a previous save was in flight, too.
      do {
        if (!await flushSave()) return;
      } while (pendingSaveRef.current);
      await onMoveQuestion(index, toIndex);
    } finally {
      if (mountedRef.current) setMoving(false);
    }
  };

  const handleTextChange = (e) => {
    const val = e.target.value;
    setText(val);
    triggerDebouncedSave({ text: val, choices, answer, time_limit_sec: timeLimitSec });
  };

  const handleChoiceTextChange = (id, val) => {
    const nextChoices = choices.map((c) => (c.id === id ? { ...c, text: val } : c));
    setChoices(nextChoices);
    triggerDebouncedSave({ text, choices: nextChoices, answer, time_limit_sec: timeLimitSec });
  };

  const handleSelectAnswer = (id) => {
    setAnswer(id);
    triggerDebouncedSave({ text, choices, answer: id, time_limit_sec: timeLimitSec });
  };

  const handleTimeLimitChange = (e) => {
    const val = Number(e.target.value);
    setTimeLimitSec(val);
    triggerDebouncedSave({ text, choices, answer, time_limit_sec: val });
  };

  const handleAddChoice = () => {
    if (choices.length >= 4) return;
    const keys = ["a", "b", "c", "d"];
    const nextKey = keys[choices.length];
    const nextChoices = [...choices, { id: nextKey, text: "" }];
    setChoices(nextChoices);
    triggerDebouncedSave({ text, choices: nextChoices, answer, time_limit_sec: timeLimitSec });
  };

  const handleRemoveChoice = (removeIdx) => {
    if (choices.length <= 2) return;
    const keys = ["a", "b", "c", "d"];
    const remaining = choices.filter((_, idx) => idx !== removeIdx);
    const nextChoices = remaining.map((c, idx) => ({ id: keys[idx], text: c.text }));

    // If the removed or shifted choice was the answer, clear answer
    const currentAnswerIdx = choices.findIndex((c) => c.id === answer);
    let nextAnswer = answer;
    if (currentAnswerIdx >= removeIdx) {
      nextAnswer = "";
    }

    setChoices(nextChoices);
    setAnswer(nextAnswer);
    triggerDebouncedSave({ text, choices: nextChoices, answer: nextAnswer, time_limit_sec: timeLimitSec });
  };

  const isFirst = index === 0;
  const isLast = index === total - 1;
  const hasProblems = problems.length > 0;

  return (
    <article
      className="card card-p transition-all"
      style={{
        border: hasProblems ? "1.5px solid var(--warning)" : "1px solid var(--border)",
      }}
      aria-labelledby={`q-title-${question.id}`}
    >
      {/* Header toolbar */}
      <header className="flex flex-wrap items-center justify-between gap-3 pb-3" style={{ borderBottom: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2">
          <span
            className="flex items-center justify-center w-7 h-7 rounded-lg font-bold text-sm"
            style={{ background: "var(--muted)", color: "var(--fg)" }}
          >
            {question.no || index + 1}
          </span>
          <h3 id={`q-title-${question.id}`} className="font-semibold text-foreground text-base">
            ข้อที่ {question.no || index + 1}
          </h3>

          {/* Validation badge */}
          {hasProblems ? (
            <span className="badge badge-warning">
              <Icon name="alert-circle" className="w-3.5 h-3.5" />
              ยังไม่พร้อม
            </span>
          ) : (
            <span className="badge badge-success">
              <Icon name="check" className="w-3.5 h-3.5" />
              พร้อม
            </span>
          )}
        </div>

        {/* Action buttons & status */}
        <div className="flex items-center gap-2">
          {/* Autosave status indicator */}
          <div className="text-xs px-2 py-1 rounded flex items-center gap-1.5" aria-live="polite">
            {saveStatus === "saving" && (
              <span className="flex items-center gap-1 animate-pulse" style={{ color: "var(--primary)" }}>
                <Icon name="loader" className="w-3.5 h-3.5 animate-spin" />
                กำลังบันทึก...
              </span>
            )}
            {saveStatus === "saved" && (
              <span className="flex items-center gap-1" style={{ color: "var(--success)" }}>
                <Icon name="check" className="w-3.5 h-3.5" />
                บันทึกแล้ว
              </span>
            )}
            {saveStatus === "error" && (
              <span className="font-medium flex items-center gap-1" style={{ color: "var(--danger)" }}>
                <Icon name="alert-circle" className="w-3.5 h-3.5" />
                บันทึกไม่สำเร็จ
              </span>
            )}
          </div>

          {/* Time limit select */}
          <div className="flex items-center gap-1.5">
            <label htmlFor={`q-time-${question.id}`} className="t-xs muted fw-6 flex items-center gap-1" style={{ whiteSpace: "nowrap" }}>
              <Icon name="clock" size={14} className="muted" />
              <span>เวลา:</span>
            </label>
            <Select
              id={`q-time-${question.id}`}
              value={timeLimitSec}
              onChange={handleTimeLimitChange}
              aria-label="เวลาต่อข้อ"
              className="fw-6"
              style={{ width: "auto", minWidth: 120, fontSize: 12.5 }}
            >
              {TIME_LIMITS.map((sec) => (
                <option key={sec} value={sec}>
                  {sec} วินาที
                </option>
              ))}
            </Select>
          </div>

          {/* Move up / down buttons */}
          <div className="flex items-center gap-1.5" title="จัดลำดับคำถาม">
            <span className="t-xs muted fw-6" style={{ whiteSpace: "nowrap" }}>ลำดับ:</span>
            <div
              className="flex items-center"
              style={{
                border: "1.5px solid var(--border)",
                borderRadius: 9,
                overflow: "hidden",
                background: "var(--card)",
                height: 32,
                boxShadow: "inset 1px 1px 2px rgba(15,23,42,.03)",
              }}
            >
              <button
                type="button"
                onClick={() => handleMove(index - 1)}
                disabled={isFirst || moving}
                aria-label={`เลื่อนข้อที่ ${question.no} ขึ้น`}
                title="เลื่อนขึ้น"
                className="btn btn-ghost"
                style={{
                  height: 30,
                  width: 30,
                  padding: 0,
                  borderRadius: 0,
                }}
              >
                <Icon name="chevD" size={14} style={{ transform: "rotate(180deg)" }} />
              </button>
              <span style={{ width: 1, height: 16, background: "var(--border)" }} />
              <button
                type="button"
                onClick={() => handleMove(index + 1)}
                disabled={isLast || moving}
                aria-label={`เลื่อนข้อที่ ${question.no} ลง`}
                title="เลื่อนลง"
                className="btn btn-ghost"
                style={{
                  height: 30,
                  width: 30,
                  padding: 0,
                  borderRadius: 0,
                }}
              >
                <Icon name="chevD" size={14} />
              </button>
            </div>
          </div>

          {/* Delete question button */}
          <button
            type="button"
            onClick={() => onDeleteQuestion(question)}
            aria-label={`ลบข้อที่ ${question.no}`}
            title="ลบคำถาม"
            className="btn btn-sm btn-danger"
            style={{ height: 32, width: 32, padding: 0 }}
          >
            <Icon name="trash" size={14} />
          </button>
        </div>
      </header>

      {/* Question Textarea */}
      <div className="field mt-4">
        <label htmlFor={`q-text-${question.id}`} className="label">
          โจทย์คำถาม <span className="c-danger">*</span>
        </label>
        <textarea
          id={`q-text-${question.id}`}
          rows={3}
          value={text}
          onChange={handleTextChange}
          placeholder="พิมพ์โจทย์คำถามที่นี่..."
          className="input"
          style={{ minHeight: 78 }}
        />
      </div>

      {/* Choices Grid */}
      <div className="field mt-4">
        <div className="flex items-center justify-between mb-2">
          <label className="label mb-0">
            ตัวเลือก (2–4 ข้อ) · เลือกวงกลมหน้าข้อที่ถูกต้อง <span className="c-danger">*</span>
          </label>
          <span className="hint">
            {choices.length}/4 ข้อ
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {choices.map((choice, cIdx) => {
            const style = CHOICE_STYLES[cIdx] || CHOICE_STYLES[0];
            const isAnswer = answer === choice.id;

            return (
              <div
                key={choice.id}
                className="flex items-center gap-2 p-2 rounded-xl transition-all"
                style={{
                  border: isAnswer ? "1.5px solid var(--success)" : "1.5px solid var(--border)",
                  background: isAnswer ? "var(--success-soft)" : "var(--card)",
                  boxShadow: isAnswer ? "0 2px 8px rgba(31,122,77,.08)" : "none",
                }}
              >
                {/* Radio to pick answer */}
                <label className="flex items-center cursor-pointer p-1" title={isAnswer ? "คำตอบที่ถูกต้อง" : "คลิกเลือกเป็นคำตอบที่ถูกต้อง"}>
                  <input
                    type="radio"
                    name={`correct-answer-${question.id}`}
                    value={choice.id}
                    checked={isAnswer}
                    onChange={() => handleSelectAnswer(choice.id)}
                    style={{ accentColor: "var(--success)", width: 18, height: 18, cursor: "pointer" }}
                    aria-label={`เลือกตัวเลือก ${style.label} เป็นคำตอบที่ถูกต้อง`}
                  />
                </label>

                {/* Shape & letter badge */}
                <div
                  className={`flex items-center justify-center gap-1 px-2 py-1 rounded-lg font-bold text-xs shrink-0 select-none ${style.badge}`}
                  title={`${style.name} (${style.label})`}
                >
                  <ChoiceIcon shape={style.shape} className="w-3.5 h-3.5" />
                  <span>{style.label}</span>
                </div>

                {/* Choice text input */}
                <input
                  type="text"
                  value={choice.text}
                  onChange={(e) => handleChoiceTextChange(choice.id, e.target.value)}
                  placeholder={`ข้อความตัวเลือก ${style.label}...`}
                  className="input flex-1"
                  style={{ height: 38 }}
                />

                {/* Remove choice button */}
                {choices.length > 2 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveChoice(cIdx)}
                    title={`ลบตัวเลือก ${style.label}`}
                    aria-label={`ลบตัวเลือก ${style.label}`}
                    className="btn btn-sm btn-ghost"
                    style={{ width: 28, height: 28, padding: 0 }}
                  >
                    <Icon name="x" size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Add choice button if less than 4 */}
        {choices.length < 4 && (
          <div className="mt-3">
            <button
              type="button"
              onClick={handleAddChoice}
              className="btn btn-sm btn-soft"
            >
              <Icon name="plus" size={14} />
              เพิ่มตัวเลือก ({choices.length}/4)
            </button>
          </div>
        )}
      </div>

      {/* Inline problems alert */}
      {hasProblems && (
        <div
          className="mt-4 p-3 rounded-xl text-xs"
          style={{
            background: "var(--warning-soft)",
            border: "1px solid var(--warning)",
            color: "var(--warning)",
          }}
        >
          <div className="font-semibold flex items-center gap-1.5 mb-1">
            <Icon name="alert-triangle" className="w-4 h-4 shrink-0" />
            <span>ข้อนี้ยังไม่พร้อมเปิดห้อง:</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 pl-1" style={{ color: "var(--warning)" }}>
            {problems.map((p, pIdx) => (
              <li key={pIdx}>{p.reason}</li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
