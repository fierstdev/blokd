export const meta = () => ({
  title: "About | Blokd App",
  description: "About this minimal Blokd application."
});

export default function About() {
  return (
    <section>
      <h1>About</h1>

      <p>
        This route has no event handlers or islands, so Blokd can treat it as a
        static/server-rendered route.
      </p>
    </section>
  );
}