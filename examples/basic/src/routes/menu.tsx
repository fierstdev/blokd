import { For } from 'blokd';
import { menu, restaurant } from '../data/restaurant';
import { MenuSection } from '../components/MenuSection';

export const meta = () => ({
  title: `Menu | ${restaurant.name}`,
  description: 'Explore the current food and drink menu at Juniper Table.'
});

export default function MenuPage() {
  return (
    <section class="page">
      <header><h1>Menu</h1><p>Our menu changes with the season. Availability may vary slightly each evening.</p></header>
      <div class="menu-list">
        <For each={menu} by={(section: any) => section.title}>{(section: any) => <MenuSection section={section} />}</For>
      </div>
    </section>
  );
}
