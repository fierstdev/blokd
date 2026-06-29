import { island, signal } from 'blokd';

function CounterView() {
  const [count, setCount] = signal(0);
  return (
    <button type="button" data-counter-button onClick={() => setCount(value => value + 1)}>
      Count: {count()}
    </button>
  );
}

export const Counter = island(CounterView, { name: 'Counter' });
