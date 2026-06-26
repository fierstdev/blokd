# Edge Case Matrix

## Reactivity

| Case | Expected behavior |
|---|---|
| Repeated signal read in one effect | One subscription, one rerun per update. |
| Signal update to identical value | No notification by default. |
| `equals: false` signal | Always notifies. |
| Effect creates nested effects | Nested owners are disposed before rerun. |
| Cleanup inside effect | Runs before rerun and on disposal. |
| Memo during SSR | Computes synchronously even though effects are disabled. |
| Cyclic updates | Throws `Reactive update limit exceeded`. |

## SSR

| Case | Expected behavior |
|---|---|
| User text contains `<script>` | Escaped as text. |
| JSON data contains `</script>` | Escaped as `\u003c/script>`. |
| `innerHTML` prop | Throws by default. |
| Boolean attributes | Render as present/absent. |
| Void elements | Do not render closing tags. |
| `class` + `classList` | Merged. |
| `effect()` in server render | No-op. |

## Routing

| Case | Expected behavior |
|---|---|
| Duplicate route paths | Build/startup error. |
| Trailing slash | Normalized except root. |
| Malformed percent encoding | No match; no process crash. |
| `HEAD` request | Same headers/status as `GET`, empty body. |
| Unsupported method | `405 Method Not Allowed`. |
| Loader `notFound()` | Returns 404. |
| Action `redirect()` | Returns redirect response. |

## Resumability

| Case | Expected behavior |
|---|---|
| Invalid ref format | Throws during `resumable()`. |
| Unsafe URL scheme | Throws/rejects. |
| Custom policy denies ref | Dispatch is blocked and `onError` receives the error. |
| Duplicate interaction while module is loading | Reuses in-flight import promise. |
| Missing handler export | Error routed to `onError` or async throw. |
| Server environment | `startResumability()` returns a no-op disposer. |
