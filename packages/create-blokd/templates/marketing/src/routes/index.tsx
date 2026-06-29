export const meta = () => ({
  title: "Blokd Marketing",
  description: "A static marketing site built with Blokd."
});

export const runtime = "none";

export const budget = {
  client: "0kb"
};

export default function Home() {
  return (
    <section>
      <h1>Blokd Marketing</h1>

      <p>
        A server-rendered marketing starter with no client framework runtime.
      </p>

      <p><a href="/pricing">View pricing</a></p>
    </section>
  );
}
