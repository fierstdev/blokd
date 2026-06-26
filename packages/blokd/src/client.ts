export { render, hydrate } from './jsx-runtime.js';
export { startResumability, registerResumable, unregisterResumable, resumable, Island } from './resume.js';

export type EnhanceOptions = {
  root?: Document | Element;
  onNavigate?: (url: URL) => void | Promise<void>;
  onSubmit?: (form: HTMLFormElement, submitter: HTMLElement | null) => void | Promise<void>;
};

function closestAnchor(target: EventTarget | null): HTMLAnchorElement | null {
  return target instanceof Element ? target.closest('a[href]') : null;
}

function isEligibleAnchor(anchor: HTMLAnchorElement, event: MouseEvent): boolean {
  if (event.defaultPrevented || event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  if (anchor.target && anchor.target !== '_self') return false;
  if (anchor.hasAttribute('download')) return false;
  const url = new URL(anchor.href, location.href);
  return url.origin === location.origin;
}

export function enhance(options: EnhanceOptions = {}): () => void {
  const root = options.root ?? document;

  const click = (event: Event) => {
    if (!(event instanceof MouseEvent)) return;
    const anchor = closestAnchor(event.target);
    if (!anchor || !isEligibleAnchor(anchor, event)) return;
    if (!options.onNavigate) return;
    event.preventDefault();
    void options.onNavigate(new URL(anchor.href, location.href));
  };

  const submit = (event: Event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    if (!options.onSubmit) return;
    const submitter = event instanceof SubmitEvent && event.submitter instanceof HTMLElement ? event.submitter : null;
    event.preventDefault();
    void options.onSubmit(form, submitter);
  };

  root.addEventListener('click', click);
  root.addEventListener('submit', submit);
  return () => {
    root.removeEventListener('click', click);
    root.removeEventListener('submit', submit);
  };
}
