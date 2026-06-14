"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import Icon from "./Icon";

const ConfirmContext = createContext();

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

  const handleClose = () => {
    if (dialogState) {
      dialogState.resolve(false);
      setDialogState(null);
    }
  };

  const handleConfirm = () => {
    if (dialogState) {
      dialogState.resolve(true);
      setDialogState(null);
    }
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialogState && (
        <div className="overlay" onClick={handleClose} style={{ zIndex: 999 }}>
          <div className="dialog scroll" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
            <div className="dialog-h flex items-start gap-4" style={{ padding: "24px 24px 0" }}>
              <div 
                style={{ 
                  width: 44, 
                  height: 44, 
                  borderRadius: 12, 
                  background: dialogState.danger ? "var(--danger-soft)" : "var(--primary-soft)", 
                  color: dialogState.danger ? "var(--danger)" : "var(--primary)",
                  display: "grid",
                  placeItems: "center",
                  flexShrink: 0
                }}
              >
                <Icon name={dialogState.danger ? "trash" : "alert"} size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="t" style={{ fontSize: "16.5px", fontWeight: 700, color: "var(--fg)" }}>
                  {dialogState.title || (dialogState.danger ? "ยืนยันการลบข้อมูล" : "ยืนยันการดำเนินการ")}
                </div>
                {dialogState.desc && (
                  <div className="d pretty" style={{ fontSize: "12.5px", color: "var(--muted-fg)", marginTop: 4 }}>
                    {dialogState.desc}
                  </div>
                )}
              </div>
            </div>
            
            <div className="dialog-b" style={{ padding: "16px 24px 24px" }}>
              <p style={{ fontSize: "14px", color: "#334155", lineHeight: 1.6, whiteSpace: "pre-line", margin: 0 }}>
                {dialogState.message}
              </p>
            </div>
            
            <div className="dialog-f" style={{ padding: "14px 24px 20px", background: "#f8fafc", borderTop: "1px solid var(--border)", borderBottomLeftRadius: 18, borderBottomRightRadius: 18, gap: 12, display: "flex", justifyContent: "flex-end" }}>
              <button 
                className="btn btn-outline" 
                onClick={handleClose}
                style={{ height: 36, padding: "0 16px", borderRadius: 8, fontSize: "13px" }}
              >
                {dialogState.cancelText || "ยกเลิก"}
              </button>
              <button 
                className={`btn ${dialogState.danger ? 'btn-danger' : 'btn-primary'}`} 
                onClick={handleConfirm}
                style={{ 
                  height: 36, 
                  padding: "0 16px", 
                  borderRadius: 8, 
                  fontSize: "13px",
                  background: dialogState.danger ? "var(--danger)" : "var(--primary)",
                  color: "#fff",
                  borderColor: "transparent"
                }}
              >
                {dialogState.confirmText || "ยืนยัน"}
              </button>
            </div>
          </div>
        </div>
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
