export const meta = ({ status }: any) => ({
  title: `${status ?? 500} Error | Blokd`,
  description: 'The request could not be completed.'
});

export default function ErrorPage(props: any) {
  const status = props.status ?? props.error?.response?.status ?? 500;
  return (
    <section class="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8">
      <div class="surface-panel p-8">
        <span class="badge badge-error">{status}</span>
        <h1 class="mt-4 text-5xl font-black tracking-normal">Something went wrong</h1>
        <p class="mt-4 text-lg leading-8 text-base-content/75">The request could not be completed. Try again or return to the documentation.</p>
        <div class="mt-8">
          <a class="btn btn-primary" href="/docs">Open docs</a>
        </div>
      </div>
    </section>
  );
}
