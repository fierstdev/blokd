import { restaurant } from '../data/restaurant';

export function Footer() {
  return (
    <footer class="site-footer">
      <p>{restaurant.address.street}, {restaurant.address.city}, {restaurant.address.region} {restaurant.address.postalCode}</p>
      <p><a href={`tel:${restaurant.phone}`}>{restaurant.phone}</a> · <a href={`mailto:${restaurant.email}`}>{restaurant.email}</a></p>
    </footer>
  );
}
