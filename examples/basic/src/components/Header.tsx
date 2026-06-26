import { restaurant } from '../data/restaurant';

export function Header() {
  return (
    <header class="site-header">
      <a class="brand" href="/">{restaurant.name}</a>
      <nav aria-label="Primary navigation">
        <a href="/menu">Menu</a>
        <a href="/reservations">Reservations</a>
        <a href="/contact">Contact</a>
      </nav>
    </header>
  );
}
