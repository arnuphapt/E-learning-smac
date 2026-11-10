"use client";

import React, { createContext, useContext, useState, useCallback, useRef, useEffect, useId } from "react";
import Icon from "./Icon";
import { getFocusableElements, registerDialogKeyHandler } from "./dialog-focus";

const ConfirmContext = createContext();

function ConfirmDialogContent({
  title,
  desc,
  message,
  danger,
  cancelText,
  confirmText,
  onClose,
  onConfirm,
}) {
  const dialogRef = useRef(null);
  const cancelBtnRef = useRef(null);
  const prevActiveElement = useRef(null);
  const titleId = useId();

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    prevActiveElement.current = document.activeElement;
    cancelBtnRef.current?.focus();

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onCloseRef.current?.();
        return;
      }

      if (e.key === "Tab") {
        const focusables = getFocusableElements(dialogRef.current);
        if (focusables.length === 0) {
          e.preventDefault();
          dialogRef.current?.focus();
          return;
        }

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (
            document.activeElement === first ||
            document.activeElement === dialogRef.current ||
            !dialogRef.current?.contains(document.activeElement)
          ) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (
            document.activeElement === last ||
            document.activeElement === dialogRef.current ||
            !dialogRef.current?.contains(document.activeElement)
          ) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    const unregister = registerDialogKeyHandler(handleKeyDown);
    return () => {
      if (!unregister()) return;
      const prev = prevActiveElement.current;
      if (prev && prev !== document.body && typeof prev.focus === "function") {
        if (!("isConnected" in prev) || prev.isConnected) {
          prev.focus();
        }
      }
    };
  }, []);

  const resolvedTitle = title || (danger ? "ยืนยันการลบข้อมูล" : "ยืนยันการดำเนินการ");

  return (
    <div className="overlay" onClick={onClose} style={{ zIndex: 999 }}>
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="dialog scroll"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 440, outline: "none" }}
      >
        <div className="dialog-h flex items-start gap-4" style={{ padding: "24px 24px 0" }}>
          <div 
            style={{ 
              width: 44, 
              height: 44, 
              borderRadius: 12, 
              background: danger ? "var(--danger-soft)" : "var(--primary-soft)", 
              color: danger ? "var(--danger)" : "var(--primary)",
              display: "grid",
              placeItems: "center",
              flexShrink: 0
            }}
          >
            <Icon name={danger ? "trash" : "alert"} size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <div id={titleId} className="t" style={{ fontSize: "16.5px", fontWeight: 700, color: "var(--fg)" }}>
              {resolvedTitle}
            </div>
            {desc && (
              <div className="d pretty" style={{ fontSize: "12.5px", color: "var(--muted-fg)", marginTop: 4 }}>
                {desc}
              </div>
            )}
          </div>
        </div>
        
        <div className="dialog-b" style={{ padding: "16px 24px 24px" }}>
          <p style={{ fontSize: "14px", color: "#334155", lineHeight: 1.6, whiteSpace: "pre-line", margin: 0 }}>
            {message}
          </p>
        </div>
        
        <div className="dialog-f" style={{ padding: "14px 24px 20px", background: "#f8fafc", borderTop: "1px solid var(--border)", borderBottomLeftRadius: 18, borderBottomRightRadius: 18, gap: 12, display: "flex", justifyContent: "flex-end" }}>
          <button 
            ref={cancelBtnRef}
            type="button"
            className="btn btn-outline" 
            onClick={onClose}
            style={{ height: 36, padding: "0 16px", borderRadius: 8, fontSize: "13px" }}
          >
            {cancelText || "ยกเลิก"}
          </button>
          <button 
            type="button"
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} 
            onClick={onConfirm}
            style={{ 
              height: 36, 
              padding: "0 16px", 
              borderRadius: 8, 
              fontSize: "13px",
              background: danger ? "var(--danger)" : "var(--primary)",
              color: "#fff",
              borderColor: "transparent"
            }}
          >
            {confirmText || "ยืนยัน"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open = true,
  title,
  desc,
  message,
  danger,
  cancelText,
  confirmText,
  onClose,
  onCancel,
  onConfirm,
}) {
  if (!open) return null;
  return (
    <ConfirmDialogContent
      title={title}
      desc={desc}
      message={message}
      danger={danger}
      cancelText={cancelText}
      confirmText={confirmText}
      onClose={onClose || onCancel}
      onConfirm={onConfirm}
    />
  );
}

export function ConfirmProvider({ children }) {
  const [dialogState, setDialogState] = useState(null);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setDialogState({
        ...options,
        resolve,
      });
    });
  }, []);

  const handleClose = useCallback(() => {
    setDialogState((prev) => {
      if (prev?.resolve) prev.resolve(false);
      return null;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setDialogState((prev) => {
      if (prev?.resolve) prev.resolve(true);
      return null;
    });
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialogState && (
        <ConfirmDialogContent
          title={dialogState.title}
          desc={dialogState.desc}
          message={dialogState.message}
          danger={dialogState.danger}
          cancelText={dialogState.cancelText}
          confirmText={dialogState.confirmText}
          onClose={handleClose}
          onConfirm={handleConfirm}
        />
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return context;
}

export default ConfirmDialog;
