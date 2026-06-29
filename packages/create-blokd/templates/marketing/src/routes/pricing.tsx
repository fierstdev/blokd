export const meta = () => ({
  title: "Pricing | Blokd App",
  description: "Static pricing page."
});

export const runtime = "none";

export const budget = {
  client: "0kb"
};

export default function Pricing() {
  return (
    <section>
      <h1>Pricing</h1>
      <p>Simple static pricing tiers with no client JavaScript.</p>
      <ul>
        <li>Starter: $99</li>
        <li>Growth: $299</li>
        <li>Scale: custom</li>
      </ul>
    </section>
  );
}
