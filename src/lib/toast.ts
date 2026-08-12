const TOAST_KIND = {
  SUCCESS: "success",
  ERROR: "error",
} as const;

type ToastKind = (typeof TOAST_KIND)[keyof typeof TOAST_KIND];

interface ToastOptions {
  durationMs?: number;
}

interface ToastEntry {
  el: HTMLElement;
  timer: number | null;
}

const DEFAULT_SUCCESS_DURATION_MS = 4000;
const ENTER_DURATION_MS = 200;
const EXIT_DURATION_MS = 150;
const EXIT_FALLBACK_MS = 200;
const TOAST_CONTAINER_ID = "toast-container";

const containerClasses = [
  "fixed",
  "z-50",
  "bottom-0",
  "inset-x-0",
  "px-4",
  "pb-4",
  "md:bottom-4",
  "md:right-4",
  "md:left-auto",
  "md:px-0",
  "md:pb-0",
  "flex",
  "flex-col",
  "gap-2",
  "pointer-events-none",
];

const toastBaseClasses = [
  "pointer-events-auto",
  "bg-surface-container",
  "rounded-md",
  "shadow-lg",
  "w-full",
  "md:w-auto",
  "md:max-w-sm",
  "border-l-4",
  "transition-all",
  "duration-200",
  "ease-out",
  "opacity-0",
];

const toastSuccessAccent = "border-l-tertiary-fixed";
const toastErrorAccent = "border-l-error";
const toastEnterClasses = ["opacity-100", "translate-y-0"];
const toastExitClasses = ["opacity-0", "translate-y-2"];

const activeToasts = new Set<ToastEntry>();
let escapeListenerInstalled = false;

function findEntryForElement(el: HTMLElement): ToastEntry | undefined {
  for (const entry of activeToasts) {
    if (entry.el === el) return entry;
  }
  return undefined;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function installEscapeListener(): void {
  if (escapeListenerInstalled) return;
  escapeListenerInstalled = true;
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const container = document.getElementById(TOAST_CONTAINER_ID);
    if (!container) return;
    const last = container.lastElementChild;
    if (!(last instanceof HTMLElement)) return;
    const entry = findEntryForElement(last);
    if (entry) dismissToast(entry);
  });
}

function getContainer(): HTMLElement {
  let container = document.getElementById(TOAST_CONTAINER_ID);
  if (container) return container;
  container = document.createElement("div");
  container.id = TOAST_CONTAINER_ID;
  container.setAttribute("role", "region");
  container.setAttribute("aria-label", "Notificaciones");
  container.className = containerClasses.join(" ");
  document.body.appendChild(container);
  installEscapeListener();
  return container;
}

function dismissToast(entry: ToastEntry): void {
  if (entry.timer !== null) {
    window.clearTimeout(entry.timer);
    entry.timer = null;
  }
  activeToasts.delete(entry);
  const el = entry.el;
  el.classList.remove(...toastEnterClasses);
  el.classList.add(...toastExitClasses);
  el.style.transitionDuration = `${EXIT_DURATION_MS}ms`;
  let removed = false;
  const cleanup = (): void => {
    if (removed) return;
    removed = true;
    el.remove();
  };
  el.addEventListener("transitionend", cleanup, { once: true });
  window.setTimeout(cleanup, EXIT_FALLBACK_MS);
}

function createIcon(kind: ToastKind): HTMLSpanElement {
  const icon = document.createElement("span");
  const colorClass = kind === TOAST_KIND.SUCCESS ? "text-tertiary-fixed" : "text-error";
  icon.className = `material-symbols-outlined text-xl shrink-0 ${colorClass}`;
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = kind === TOAST_KIND.SUCCESS ? "check_circle" : "error";
  return icon;
}

function createMessage(message: string): HTMLParagraphElement {
  const messageEl = document.createElement("p");
  messageEl.className = "font-label-sm text-label-sm text-on-surface flex-1 leading-snug";
  messageEl.textContent = message;
  return messageEl;
}

function createCloseButton(onClick: () => void): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className =
    "text-on-surface-variant hover:text-on-surface transition-colors shrink-0 -mr-1 -mt-1 p-1";
  button.setAttribute("aria-label", "Cerrar notificación");
  const icon = document.createElement("span");
  icon.className = "material-symbols-outlined text-lg";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = "close";
  button.appendChild(icon);
  button.addEventListener("click", onClick);
  return button;
}

export function showToast(
  message: string,
  kind: ToastKind,
  options?: ToastOptions,
): void {
  if (typeof document === "undefined") return;

  const container = getContainer();
  const reducedMotion = prefersReducedMotion();
  const accentClass =
    kind === TOAST_KIND.SUCCESS ? toastSuccessAccent : toastErrorAccent;

  const toast = document.createElement("div");
  const initialTransformClass = reducedMotion ? "" : "translate-y-2";
  toast.className = [
    ...toastBaseClasses,
    accentClass,
    initialTransformClass,
  ]
    .filter((c): c is string => c.length > 0)
    .join(" ");

  if (kind === TOAST_KIND.SUCCESS) {
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
  } else {
    toast.setAttribute("role", "alert");
    toast.setAttribute("aria-live", "assertive");
  }

  const inner = document.createElement("div");
  inner.className = "flex items-start gap-3 px-4 py-3";

  const entry: ToastEntry = { el: toast, timer: null };

  inner.appendChild(createIcon(kind));
  inner.appendChild(createMessage(message));
  inner.appendChild(createCloseButton(() => dismissToast(entry)));

  toast.appendChild(inner);
  activeToasts.add(entry);
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove("opacity-0");
    if (!reducedMotion) toast.classList.remove("translate-y-2");
    toast.classList.add("opacity-100");
    if (!reducedMotion) toast.classList.add("translate-y-0");
  });

  if (kind === TOAST_KIND.SUCCESS) {
    const duration = options?.durationMs ?? DEFAULT_SUCCESS_DURATION_MS;
    entry.timer = window.setTimeout(() => dismissToast(entry), duration);
  }
}
