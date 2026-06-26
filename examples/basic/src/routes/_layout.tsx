import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { restaurant } from '../data/restaurant';

export const meta = () => ({
  title: restaurant.name,
  description: restaurant.tagline,
  links: [{ rel: 'stylesheet', href: '/styles.css' }]
});

export default function Layout(props: any) {
  return (
    <>
      <Header />
      <main>{props.children}</main>
      <Footer />
    </>
  );
}
