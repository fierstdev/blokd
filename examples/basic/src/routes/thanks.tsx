import { restaurant } from '../data/restaurant';
export const meta = () => ({ title: `Thank You | ${restaurant.name}` });
export default function ThanksPage() {
  return <section class="page narrow"><h1>Thank you.</h1><p>We received your request. Our team will respond as soon as possible.</p><p><a href="/">Return home</a></p></section>;
}
