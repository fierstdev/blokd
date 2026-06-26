import type { ResumeContext } from 'blokd/resume';

type EstimatorState = { guests: number; perGuest: number };

export function updateGuests(event: Event, ctx: ResumeContext<EstimatorState>) {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) return;
  const guests = Number(input.value);
  const previous = ctx.state ?? { guests: 12, perGuest: 75 };
  const next = { ...previous, guests };
  ctx.setState(next);
  const output = ctx.island?.querySelector('[data-estimate-output]');
  if (output) output.textContent = `${next.guests} guests · estimated minimum $${next.guests * next.perGuest}`;
}
