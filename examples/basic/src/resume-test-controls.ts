import { registerResumable, startResumability, unregisterResumable } from 'blokd/client';

declare global {
  interface Window {
    __blokdResumeTest?: {
      register: typeof registerResumable;
      unregister: typeof unregisterResumable;
      start: typeof startResumability;
    };
  }
}

window.__blokdResumeTest = {
  register: registerResumable,
  unregister: unregisterResumable,
  start: startResumability
};
