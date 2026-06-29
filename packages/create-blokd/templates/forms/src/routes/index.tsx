export const meta = () => ({
  title: "Forms | Blokd App",
  description: "Native form examples in Blokd."
});

export const runtime = "none";

export const budget = {
  client: "0kb"
};

export default function Home() {
  return (
    <section>
      <h1>Forms</h1>

      <p>
        This starter demonstrates native forms and route actions without client
        JavaScript.
      </p>

      <ul>
        <li><a href="/contact">Contact form</a></li>
        <li><a href="/newsletter">Newsletter form</a></li>
      </ul>
    </section>
  );
}
