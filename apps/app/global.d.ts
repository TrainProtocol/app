// TypeScript 6 enables `noUncheckedSideEffectImports` by default, so bare
// `import "./x.css"` statements are now resolved like any other module.
// Next handles these at build time; Next's own types only cover `*.module.css`.
declare module "*.css";

// React 19's types removed the global `JSX` namespace in favour of `React.JSX`.
// This codebase uses the bare `JSX.Element` form in ~27 files; alias just that
// one member back rather than churn every call site. Deliberately narrow —
// `IntrinsicElements` and friends are left alone so JSX element type resolution
// still goes through `React.JSX` via the jsx runtime.
declare namespace JSX {
  type Element = import("react").JSX.Element;
}
