import { restaurant } from '../data/restaurant';

export const meta = () => ({
  title: `Not Found | ${restaurant.name}`,
  description: 'The requested page could not be found.'
});

export default function NotFoundPage() {
  return (
    <section class="page narrow">
      <h1>Page not found</h1>
      <p>The page you requested does not exist or has moved.</p>
      <p><a href="/">Return home</a></p>
    </section>
  );
}
