import type { ResumableContext } from 'blokd/resume';

type EstimatorState = { guests: number; perGuest: number };

export function updateGuests(event: Event, ctx: ResumableContext<EstimatorState>) {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) return;
  ctx.state.guests = Number(input.value);
  const output = ctx.island?.querySelector('[data-estimate-output]');
  if (output) output.textContent = `${ctx.state.guests} guests · estimated minimum $${ctx.state.guests * ctx.state.perGuest}`;
}
