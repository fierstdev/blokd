type CounterState = {
  count?: number;
};

type ResumableContext = {
  state: CounterState;
};

export function increment(event: Event, ctx: ResumableContext) {
  const target = event.target;

  if (!(target instanceof HTMLElement)) {
    return;
  }

  const button = target.closest("button");

  if (!button) {
    return;
  }

  const current = Number(button.dataset.count ?? ctx.state.count ?? 0);
  const next = current + 1;

  button.dataset.count = String(next);
  button.textContent = `Count: ${next}`;
}