# Limitations And Beta Contract

`0.4.0-beta.0` is a public beta. It is intentionally useful but not yet a stable `1.0.0` contract.

## Supported Beta Use Cases

- small websites
- documentation sites
- marketing sites
- local business sites
- form-driven apps
- small Hono-backed SSR applications
- route-local interactive widgets
- early evaluation of resumable island DX

## Not Yet Recommended

- large production migrations
- applications requiring long-term API stability
- regulated workloads without additional review
- complex client-side app routing
- broad ecosystem integration expectations
- full app resumability expectations

## Known Technical Boundaries

Compiler-assisted islands:

- require JSON-serializable signal state and props for replay
- rerender and replace the island root after events
- are designed for local widgets, not full-app state graphs
- rely on the Vite transform for stable inferred names in production

Static templates:

- cover safe intrinsic JSX
- fall back to runtime JSX for dynamic, eventful, component, or unsupported shapes
- should be treated as an optimization, not a user-visible semantic difference

Hydration:

- claims SSR nodes for focused roots
- uses marker ranges for dynamic content
- is not a mature full-app hydration router

Route analysis:

- is conservative
- can detect obvious client markers and island exports
- should be backed by route budgets for critical static pages

## Versioning Promise During Beta

Patch beta releases may fix bugs and tighten safety checks.

Minor beta releases may change public APIs when necessary to reach a coherent stable design.

Stable `1.0.0` should wait until:

- the compiler-assisted island contract is proven across realistic apps
- docs and starter templates reflect the final recommended path
- route analysis and budget behavior are well covered
- deployment adapters have clearer support status
- browser/runtime validation is routine
