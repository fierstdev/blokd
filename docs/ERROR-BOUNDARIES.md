# Error and 404 Boundaries

Blokd supports private route files for error and not-found UI:

```txt
src/routes/_error.tsx
src/routes/_404.tsx
src/routes/admin/_error.tsx
src/routes/admin/_404.tsx
```

Nearest boundary wins. Files beginning with `_error` or `_404` are not routable pages.

## 404 boundary

```tsx
export const meta = () => ({ title: 'Not Found' });

export default function NotFoundPage() {
  return <h1>Page not found</h1>;
}
```

`notFound()` thrown from a loader renders the nearest `_404.tsx` for document requests. Unmatched paths render the first available root 404 boundary.

## Error boundary

```tsx
export const meta = ({ error }: any) => ({ title: 'Error' });

export default function ErrorPage(props: any) {
  return <h1>Error {props.status}</h1>;
}
```

A thrown `httpError(500)` or unexpected render/loader error renders the nearest `_error.tsx`. Production responses do not serialize stack traces.
