import { restaurant } from '../data/restaurant';
import { PrivateDiningEstimator } from '../components/PrivateDiningEstimator';

export const meta = () => ({
  title: `${restaurant.name} | Seasonal Neighborhood Dining`,
  description: restaurant.tagline
});

export default function HomePage() {
  return (
    <>
      <section class="hero">
        <p class="eyebrow">Portland, Oregon</p>
        <h1>{restaurant.tagline}</h1>
        <p>Juniper Table serves seasonal plates, natural wines, and classic cocktails in a relaxed neighborhood dining room.</p>
        <p class="hero-actions">
          <a class="button" href="/reservations">Request a Reservation</a>
          <a class="button secondary" href="/menu">View Menu</a>
        </p>
      </section>
      <section class="feature-grid">
        <article><h2>Seasonal Menu</h2><p>Rotating dishes built around Pacific Northwest produce, seafood, and small farms.</p></article>
        <article><h2>Weekend Brunch</h2><p>Brunch every Saturday and Sunday with pastries, eggs, cocktails, and coffee.</p></article>
        <article><h2>Private Dining</h2><p>Intimate group dinners and semi-private events for up to 24 guests.</p></article>
      </section>
      <section class="page narrow"><PrivateDiningEstimator /></section>
    </>
  );
}
