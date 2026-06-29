import { island, signal } from 'blokd';

export const Counter = island(() => {
  const [count, setCount] = signal(0);
  return (
    <button type="button" data-counter-button onClick={() => setCount(value => value + 1)}>
      Count: {count()}
    </button>
  );
});
