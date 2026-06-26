import { For } from 'blokd';

export function MenuSection(props: any) {
  return (
    <section class="menu-section">
      <h2>{props.section.title}</h2>
      <ul>
        <For each={props.section.items} by={(item: any) => item.name}>
          {(item: any) => (
            <li class="menu-item">
              <div>
                <h3>{item.name}</h3>
                <p>{item.description}</p>
              </div>
              <strong>{item.price}</strong>
            </li>
          )}
        </For>
      </ul>
    </section>
  );
}
