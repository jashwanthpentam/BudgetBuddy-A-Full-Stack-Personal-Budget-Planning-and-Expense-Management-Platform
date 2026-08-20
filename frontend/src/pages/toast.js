/*
 * BudgetBuddy - Global Toast Notifications
 *
 * Replaces browser alert() dialogs with a clean, app-styled notification.
 * No external CSS file is required; all styles are injected here.
 */

const TOAST_ROOT_ID = "budgetbuddy-toast-root";

const TYPE_CONFIG = {
  success: {
    icon: "✓",
    accent: "#18b66a",
    soft: "rgba(24, 182, 106, 0.12)",
    label: "Success",
  },
  error: {
    icon: "!",
    accent: "#ef5b67",
    soft: "rgba(239, 91, 103, 0.12)",
    label: "Error",
  },
  warning: {
    icon: "!",
    accent: "#d8b36b",
    soft: "rgba(216, 179, 107, 0.14)",
    label: "Warning",
  },
  info: {
    icon: "i",
    accent: "#5ca8e8",
    soft: "rgba(92, 168, 232, 0.12)",
    label: "Info",
  },
};

let toastCounter = 0;

function ensureStyles() {
  if (document.getElementById("budgetbuddy-toast-styles")) return;

  const style = document.createElement("style");
  style.id = "budgetbuddy-toast-styles";

  style.textContent = `
    #${TOAST_ROOT_ID} {
      position: fixed;
      top: 22px;
      right: 22px;
      z-index: 2147483647;
      width: min(390px, calc(100vw - 32px));
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system,
        BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    .bb-toast {
      --bb-accent: #18b66a;
      --bb-soft: rgba(24, 182, 106, 0.12);

      position: relative;
      display: grid;
      grid-template-columns: 34px minmax(0, 1fr) 26px;
      align-items: center;
      gap: 11px;

      min-height: 68px;
      padding: 12px 12px 12px 14px;

      border: 1px solid color-mix(
        in srgb,
        var(--bb-accent) 22%,
        transparent
      );

      border-left: 3px solid var(--bb-accent);
      border-radius: 14px;

      background: color-mix(
        in srgb,
        #ffffff 94%,
        var(--bb-accent) 6%
      );

      color: #182334;

      box-shadow:
        0 16px 40px rgba(8, 18, 31, 0.18),
        0 4px 14px rgba(8, 18, 31, 0.10);

      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);

      pointer-events: auto;
      overflow: hidden;

      animation: bbToastIn 260ms cubic-bezier(.2,.8,.2,1) both;
    }

    .bb-toast.bb-toast-dark {
      background: color-mix(
        in srgb,
        #111b2b 94%,
        var(--bb-accent) 6%
      );

      color: #eef3f8;

      border-color: color-mix(
        in srgb,
        var(--bb-accent) 25%,
        #2a3850
      );

      box-shadow:
        0 18px 44px rgba(0, 0, 0, 0.34),
        0 4px 16px rgba(0, 0, 0, 0.20);
    }

    .bb-toast-icon {
      width: 34px;
      height: 34px;

      display: grid;
      place-items: center;

      border-radius: 10px;

      background: var(--bb-soft);
      color: var(--bb-accent);

      font-size: 15px;
      font-weight: 800;

      border: 1px solid color-mix(
        in srgb,
        var(--bb-accent) 16%,
        transparent
      );
    }

    .bb-toast-copy {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .bb-toast-label {
      font-size: 10px;
      line-height: 1;

      font-weight: 800;
      letter-spacing: .09em;
      text-transform: uppercase;

      color: var(--bb-accent);
    }

    .bb-toast-message {
      font-size: 13px;
      line-height: 1.4;

      font-weight: 600;

      overflow-wrap: anywhere;
    }

    .bb-toast-close {
      width: 26px;
      height: 26px;

      border: 0;
      border-radius: 8px;

      background: transparent;
      color: currentColor;

      opacity: .48;
      cursor: pointer;

      font-size: 18px;
      line-height: 1;

      transition:
        opacity .15s ease,
        background .15s ease;
    }

    .bb-toast-close:hover {
      opacity: .9;
      background: rgba(127, 145, 168, .12);
    }

    .bb-toast-progress {
      position: absolute;

      left: 0;
      bottom: 0;

      height: 2px;
      width: 100%;

      background: var(--bb-accent);
      opacity: .7;

      transform-origin: left;

      animation:
        bbToastProgress
        var(--bb-toast-duration, 3200ms)
        linear
        forwards;
    }

    .bb-toast.bb-toast-leaving {
      animation: bbToastOut 200ms ease forwards;
    }

    @keyframes bbToastIn {
      from {
        opacity: 0;
        transform: translate3d(18px, -6px, 0) scale(.97);
      }

      to {
        opacity: 1;
        transform: translate3d(0, 0, 0) scale(1);
      }
    }

    @keyframes bbToastOut {
      from {
        opacity: 1;
        transform: translate3d(0, 0, 0) scale(1);
      }

      to {
        opacity: 0;
        transform: translate3d(18px, -4px, 0) scale(.97);
      }
    }

    @keyframes bbToastProgress {
      from {
        transform: scaleX(1);
      }

      to {
        transform: scaleX(0);
      }
    }

    /* Confirmation modal */
    .bb-confirm-overlay {
      position: fixed;
      inset: 0;
      z-index: 2147483646;

      display: grid;
      place-items: center;
      padding: 20px;

      background: rgba(5, 12, 24, 0.62);
      backdrop-filter: blur(7px);
      -webkit-backdrop-filter: blur(7px);

      animation: bbConfirmFadeIn 160ms ease both;
    }

    .bb-confirm-dialog {
      width: min(430px, calc(100vw - 32px));
      padding: 22px;

      border: 1px solid rgba(110, 139, 178, 0.28);
      border-radius: 18px;

      background: #111b2b;
      color: #eef3f8;

      box-shadow:
        0 28px 70px rgba(0, 0, 0, 0.42),
        0 8px 24px rgba(0, 0, 0, 0.24);

      animation: bbConfirmIn 180ms cubic-bezier(.2,.8,.2,1) both;
    }

    .bb-confirm-title {
      margin: 0 0 9px;
      color: #f5f8fc;
      font-size: 17px;
      line-height: 1.3;
      font-weight: 800;
    }

    .bb-confirm-message {
      color: #aebbd0;
      font-size: 13px;
      line-height: 1.55;
      font-weight: 500;
    }

    .bb-confirm-actions {
      display: flex;
      justify-content: flex-end;
      gap: 9px;
      margin-top: 20px;
    }

    .bb-confirm-cancel,
    .bb-confirm-confirm {
      min-width: 82px;
      min-height: 38px;
      padding: 8px 15px;

      border-radius: 9px;
      border: 1px solid transparent;

      font: inherit;
      font-size: 12px;
      font-weight: 750;
      cursor: pointer;

      transition:
        transform .15s ease,
        background .15s ease,
        border-color .15s ease,
        opacity .15s ease;
    }

    .bb-confirm-cancel {
      background: rgba(127, 145, 168, 0.12);
      border-color: rgba(127, 145, 168, 0.28);
      color: #d7dfeb;
    }

    .bb-confirm-cancel:hover {
      background: rgba(127, 145, 168, 0.20);
    }

    .bb-confirm-confirm {
      background: #ef5b67;
      border-color: #ef5b67;
      color: #ffffff;
    }

    .bb-confirm-confirm:hover {
      opacity: .9;
      transform: translateY(-1px);
    }

    .bb-confirm-cancel:focus-visible,
    .bb-confirm-confirm:focus-visible {
      outline: 2px solid #5ca8e8;
      outline-offset: 2px;
    }

    @keyframes bbConfirmFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes bbConfirmIn {
      from {
        opacity: 0;
        transform: translateY(8px) scale(.98);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .bb-confirm-overlay,
      .bb-confirm-dialog {
        animation: none;
      }
    }

    @media (max-width: 560px) {
      #${TOAST_ROOT_ID} {
        top: 12px;
        right: 12px;
        width: calc(100vw - 24px);
      }

      .bb-toast {
        min-height: 62px;
        border-radius: 12px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .bb-toast,
      .bb-toast.bb-toast-leaving {
        animation: none;
      }

      .bb-toast-progress {
        animation: none;
      }
    }
  `;

  document.head.appendChild(style);
}

function getRoot() {
  let root = document.getElementById(TOAST_ROOT_ID);

  if (!root) {
    root = document.createElement("div");
    root.id = TOAST_ROOT_ID;
    document.body.appendChild(root);
  }

  return root;
}

function isDarkMode() {
  const theme = document.documentElement.getAttribute("data-theme");

  if (theme) {
    return theme === "dark";
  }

  return localStorage.getItem("theme") === "dark";
}

function removeToast(toastElement) {
  if (!toastElement || !toastElement.isConnected) {
    return;
  }

  toastElement.classList.add("bb-toast-leaving");

  window.setTimeout(() => {
    if (toastElement.isConnected) {
      toastElement.remove();
    }
  }, 200);
}

/*
 * Show toast notification
 */
export function showToast(
  message,
  type = "info",
  duration = 3200
) {
  if (typeof document === "undefined") {
    return;
  }

  ensureStyles();

  const config =
    TYPE_CONFIG[type] || TYPE_CONFIG.info;

  const root = getRoot();

  const toastElement =
    document.createElement("div");

  toastElement.className =
    `bb-toast${
      isDarkMode()
        ? " bb-toast-dark"
        : ""
    }`;

  toastElement.style.setProperty(
    "--bb-accent",
    config.accent
  );

  toastElement.style.setProperty(
    "--bb-soft",
    config.soft
  );

  toastElement.style.setProperty(
    "--bb-toast-duration",
    `${duration}ms`
  );

  toastElement.dataset.toastId =
    String(++toastCounter);

  const icon =
    document.createElement("div");

  icon.className =
    "bb-toast-icon";

  icon.textContent =
    config.icon;

  icon.setAttribute(
    "aria-hidden",
    "true"
  );

  const copy =
    document.createElement("div");

  copy.className =
    "bb-toast-copy";

  const label =
    document.createElement("div");

  label.className =
    "bb-toast-label";

  label.textContent =
    config.label;

  const text =
    document.createElement("div");

  text.className =
    "bb-toast-message";

  text.textContent =
    String(message ?? "");

  copy.append(
    label,
    text
  );

  const close =
    document.createElement("button");

  close.type = "button";

  close.className =
    "bb-toast-close";

  close.setAttribute(
    "aria-label",
    "Close notification"
  );

  close.textContent = "×";

  close.addEventListener(
    "click",
    () => removeToast(toastElement)
  );

  const progress =
    document.createElement("div");

  progress.className =
    "bb-toast-progress";

  progress.setAttribute(
    "aria-hidden",
    "true"
  );

  toastElement.append(
    icon,
    copy,
    close,
    progress
  );

  root.appendChild(
    toastElement
  );

  const timer =
    window.setTimeout(
      () => removeToast(toastElement),
      duration
    );

  close.addEventListener(
    "click",
    () => window.clearTimeout(timer),
    { once: true }
  );

  return () => {
    window.clearTimeout(timer);
    removeToast(toastElement);
  };
}

/*
 * Confirmation dialog
 *
 * Used by pages such as Notifications.jsx:
 *
 * await confirmAction(
 *   "Delete this notification?",
 *   "Delete notification"
 * );
 *
 * Returns:
 *   true  -> user confirmed
 *   false -> user cancelled
 */
export function confirmAction(
  message,
  title = "Confirm action",
  confirmLabel = "Confirm"
) {
  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      resolve(false);
      return;
    }

    ensureStyles();

    const overlay =
      document.createElement("div");

    overlay.className =
      "bb-confirm-overlay";

    const dialog =
      document.createElement("div");

    dialog.className =
      "bb-confirm-dialog";
    dialog.setAttribute("role", "alertdialog");
    dialog.setAttribute("aria-modal", "true");

    const heading =
      document.createElement("div");

    heading.className =
      "bb-confirm-title";

    heading.textContent =
      title;

    const content =
      document.createElement("div");

    content.className =
      "bb-confirm-message";

    content.textContent =
      message;

    const actions =
      document.createElement("div");

    actions.className =
      "bb-confirm-actions";

    const cancelButton =
      document.createElement("button");

    cancelButton.type = "button";

    cancelButton.className =
      "bb-confirm-cancel";

    cancelButton.textContent =
      "Cancel";

    const confirmButton =
      document.createElement("button");

    confirmButton.type = "button";

    confirmButton.className =
      "bb-confirm-confirm";

    confirmButton.textContent =
      confirmLabel;

    actions.append(
      cancelButton,
      confirmButton
    );

    dialog.append(
      heading,
      content,
      actions
    );

    overlay.appendChild(
      dialog
    );

    document.body.appendChild(
      overlay
    );

    let finished = false;

    const cleanup = (
      result
    ) => {
      if (finished) {
        return;
      }

      finished = true;

      document.removeEventListener(
        "keydown",
        handleKeyDown
      );

      if (overlay.isConnected) {
        overlay.remove();
      }

      resolve(result);
    };

    const handleKeyDown = (
      event
    ) => {
      if (event.key === "Escape") {
        cleanup(false);
      }

      if (event.key === "Enter") {
        cleanup(true);
      }
    };

    cancelButton.addEventListener(
      "click",
      () => cleanup(false)
    );

    confirmButton.addEventListener(
      "click",
      () => cleanup(true)
    );

    overlay.addEventListener(
      "click",
      (event) => {
        if (event.target === overlay) {
          cleanup(false);
        }
      }
    );

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    confirmButton.focus();
  });
}

/*
 * Toast helper object
 */
export const toast = {
  success: (
    message,
    duration
  ) =>
    showToast(
      message,
      "success",
      duration
    ),

  error: (
    message,
    duration
  ) =>
    showToast(
      message,
      "error",
      duration
    ),

  warning: (
    message,
    duration
  ) =>
    showToast(
      message,
      "warning",
      duration
    ),

  info: (
    message,
    duration
  ) =>
    showToast(
      message,
      "info",
      duration
    ),
};