import { Island, resumable } from 'blokd';

export function PrivateDiningEstimator() {
  const state = { guests: 12, perGuest: 75 };
  return (
    <Island name="private-dining-estimator" state={state}>
      <section class="estimator">
        <h2>Private Dining Estimate</h2>
        <label>
          Guests
          <input
            type="range"
            min="6"
            max="24"
            value={state.guests}
            onInput={resumable('/src/resumables/private-dining.ts#updateGuests')}
          />
        </label>
        <p data-estimate-output>{`${state.guests} guests · estimated minimum $${state.guests * state.perGuest}`}</p>
      </section>
    </Island>
  );
}
