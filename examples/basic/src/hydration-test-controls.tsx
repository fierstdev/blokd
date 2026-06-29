import { signal } from 'blokd';
import { hydrate } from 'blokd/client';

declare global {
  interface Window {
    __blokdHydrationTest?: {
      hydrateCounter(root: Element): () => void;
    };
  }
}

window.__blokdHydrationTest = {
  hydrateCounter(root) {
    const [count, setCount] = signal(0);
    return hydrate(() => (
      <button id="hydrated-counter" type="button" onClick={() => setCount(value => value + 1)}>
        Count: {count()}
      </button>
    ), root);
  }
};
