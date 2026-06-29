import { Counter } from '../islands/Counter';
import { restaurant } from '../data/restaurant';

export const meta = () => ({
  title: `Counter | ${restaurant.name}`,
  description: 'Compiler-assisted island counter example.'
});

export default function CounterPage() {
  return (
    <section class="page narrow">
      <h1>Compiler-assisted island</h1>
      <Counter />
    </section>
  );
}
