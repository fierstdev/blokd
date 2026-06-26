import { For } from 'blokd';
import { restaurant } from '../data/restaurant';

export const meta = () => ({
  title: `Contact | ${restaurant.name}`,
  description: 'Find hours, location, and contact information.'
});

export default function ContactPage() {
  return (
    <section class="page">
      <h1>Contact</h1>
      <div class="contact-grid">
        <section>
          <h2>Location</h2>
          <address>{restaurant.address.street}<br />{restaurant.address.city}, {restaurant.address.region} {restaurant.address.postalCode}</address>
          <p><a href={`tel:${restaurant.phone}`}>{restaurant.phone}</a><br /><a href={`mailto:${restaurant.email}`}>{restaurant.email}</a></p>
        </section>
        <section>
          <h2>Hours</h2>
          <dl class="hours"><For each={restaurant.hours}>{(row: readonly string[]) => <><dt>{row[0]}</dt><dd>{row[1]}</dd></>}</For></dl>
        </section>
      </div>
    </section>
  );
}
