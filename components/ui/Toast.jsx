"use client";

export function toast(message, type = "success") {
  if (typeof window === "undefined") return;

  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.style.position = "fixed";
    container.style.bottom = "24px";
    container.style.right = "24px";
    container.style.zIndex = "9999";
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.gap = "10px";
    container.style.pointerEvents = "none";
    document.body.appendChild(container);
  }

  const toastEl = document.createElement("div");
  toastEl.className = `toast-item ${type}`;
  toastEl.style.background = "linear-gradient(135deg, #0f172a, #1e293b)";
  
  if (type === "success") {
    toastEl.style.borderLeft = "4px solid #10b981";
  } else if (type === "warning") {
    toastEl.style.borderLeft = "4px solid #f59e0b";
  } else {
    toastEl.style.borderLeft = "4px solid #ef4444";
  }

  toastEl.style.color = "#fff";
  toastEl.style.padding = "14px 20px";
  toastEl.style.borderRadius = "12px";
  toastEl.style.boxShadow = "0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)";
  toastEl.style.fontSize = "14px";
  toastEl.style.fontFamily = "var(--font-sans, system-ui, -apple-system, sans-serif)";
  toastEl.style.fontWeight = "500";
  toastEl.style.display = "flex";
  toastEl.style.alignItems = "center";
  toastEl.style.gap = "12px";
  toastEl.style.minWidth = "300px";
  toastEl.style.maxWidth = "420px";
  toastEl.style.pointerEvents = "auto";
  toastEl.style.transform = "translateY(30px) scale(0.95)";
  toastEl.style.opacity = "0";
  toastEl.style.transition = "all 0.35s cubic-bezier(0.16, 1, 0.3, 1)";
  
  const iconSpan = document.createElement("span");
  iconSpan.style.display = "flex";
  iconSpan.style.alignItems = "center";
  iconSpan.style.justifyContent = "center";
  iconSpan.style.flexShrink = "0";
  
  if (type === "success") {
    iconSpan.innerHTML = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M7 10l2 2 4-4" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  } else if (type === "warning") {
    iconSpan.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
  } else {
    iconSpan.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
  }
  
  toastEl.appendChild(iconSpan);

  const textSpan = document.createElement("span");
  textSpan.style.lineHeight = "1.4";
  textSpan.innerText = message;
  toastEl.appendChild(textSpan);

  container.appendChild(toastEl);

  setTimeout(() => {
    toastEl.style.transform = "translateY(0) scale(1)";
    toastEl.style.opacity = "1";
  }, 10);

  setTimeout(() => {
    toastEl.style.transform = "translateY(-15px) scale(0.95)";
    toastEl.style.opacity = "0";
    setTimeout(() => {
      if (toastEl.parentNode) {
        toastEl.parentNode.removeChild(toastEl);
      }
    }, 350);
  }, 3500);
}

export default toast;
