/**
 * Lazy Cloudflare Turnstile loader shared by the contact and booking forms.
 *
 * Rendering the widget pulls in Cloudflare's challenge platform (~1.5 MiB of
 * scripts), which used to load on every page view — even for visitors who
 * never reach a form. Instead, api.js is requested (explicit render mode) only
 * when the form gets close to the viewport or a field inside it receives
 * focus, and nothing is loaded on pages without a form.
 *
 * The server still verifies every token (handleContact in the OAuth sidecar),
 * so loading the widget later does not weaken the check: a submit without a
 * token is rejected with `captcha_required` exactly as before.
 */
const API_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
/** Start loading this far before the form scrolls into view. */
const PRELOAD_MARGIN = "800px 0px";

type TurnstileApi = {
  render: (container: HTMLElement, options: { sitekey: string; callback: (token: string) => void }) => string;
};

let apiPromise: Promise<TurnstileApi> | null = null;

function loadApi(): Promise<TurnstileApi> {
  const existing = (window as unknown as { turnstile?: TurnstileApi }).turnstile;
  if (existing) return Promise.resolve(existing);
  if (!apiPromise) {
    apiPromise = new Promise<TurnstileApi>((resolve, reject) => {
      const script = document.createElement("script");
      script.src = API_SRC;
      script.async = true;
      script.onload = () => {
        const api = (window as unknown as { turnstile?: TurnstileApi }).turnstile;
        if (api) resolve(api);
        else reject(new Error("Turnstile API missing after load"));
      };
      script.onerror = () => reject(new Error("Turnstile API failed to load"));
      document.head.appendChild(script);
    }).catch((error: unknown) => {
      // Allow a later trigger (scroll/focus) to retry after a network failure.
      apiPromise = null;
      throw error;
    });
  }
  return apiPromise;
}

/**
 * Renders the Turnstile widget inside `container` once `form` is near the
 * viewport or gets focus. `container` must carry `data-sitekey`.
 */
export function mountTurnstileWhenNeeded(
  form: HTMLElement,
  container: HTMLElement,
  onToken: (token: string) => void,
): void {
  const sitekey = container.dataset.sitekey;
  if (!sitekey) return;

  let state: "idle" | "loading" | "rendered" = "idle";
  let observer: IntersectionObserver | null = null;

  const start = (): void => {
    if (state !== "idle") return;
    state = "loading";
    loadApi()
      .then((api) => {
        api.render(container, { sitekey, callback: onToken });
        state = "rendered";
        observer?.disconnect();
        form.removeEventListener("focusin", start);
      })
      .catch(() => {
        state = "idle";
      });
  };

  form.addEventListener("focusin", start);
  if ("IntersectionObserver" in window) {
    observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) start();
    }, { rootMargin: PRELOAD_MARGIN });
    observer.observe(form);
  } else {
    start();
  }
}
