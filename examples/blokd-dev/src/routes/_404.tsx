export const meta = () => ({
  title: 'Not Found | Blokd',
  description: 'The requested Blokd documentation page was not found.'
});

export default function NotFoundPage() {
  return (
    <section class="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
      <div class="surface-panel p-8">
        <span class="badge badge-error">404</span>
        <h1 class="mt-4 text-5xl font-black tracking-normal">Page not found</h1>
        <p class="mt-4 text-lg leading-8 text-base-content/75">The page does not exist or has moved.</p>
        <div class="mt-8 flex flex-wrap gap-3">
          <a class="btn btn-primary" href="/docs">Browse docs</a>
          <a class="btn btn-outline" href="/">Go home</a>
        </div>
      </div>
    </section>
  );
}
