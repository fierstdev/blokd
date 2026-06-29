import { defineAction } from "blokd/resume";

type CounterState = {
  count: number;
};

export const increment = defineAction<CounterState>(({ state, el }) => {
  state.count += 1;
  el.text(`Count: ${state.count}`);
});
