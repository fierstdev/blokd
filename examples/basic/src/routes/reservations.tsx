import { redirect } from 'blokd/server';
import { restaurant } from '../data/restaurant';

export const meta = () => ({
  title: `Reservations | ${restaurant.name}`,
  description: 'Request a reservation at Juniper Table.'
});

export const action = async ({ request }: any) => {
  const form = await request.formData();
  const name = String(form.get('name') ?? '').trim();
  const email = String(form.get('email') ?? '').trim();
  const partySize = String(form.get('partySize') ?? '').trim();
  const date = String(form.get('date') ?? '').trim();
  const time = String(form.get('time') ?? '').trim();

  if (!name || !email || !partySize || !date || !time) {
    return new Response('Missing required reservation fields.', { status: 400 });
  }

  console.log('Reservation request', { name, email, partySize, date, time });
  redirect('/thanks');
};

export default function ReservationsPage() {
  return (
    <section class="page narrow">
      <h1>Request a Reservation</h1>
      <p>Submit a request and our team will confirm availability by email.</p>
      <form method="post" class="form">
        <label>Name<input name="name" required autocomplete="name" /></label>
        <label>Email<input name="email" type="email" required autocomplete="email" /></label>
        <label>Party size<input name="partySize" type="number" min="1" max="12" required /></label>
        <label>Date<input name="date" type="date" required /></label>
        <label>Time<input name="time" type="time" required /></label>
        <label>Notes<textarea name="notes" placeholder="Accessibility needs, dietary restrictions, special occasion..." /></label>
        <button>Submit Request</button>
      </form>
    </section>
  );
}
