// TypeScript 6 enables `noUncheckedSideEffectImports` by default, so bare
// `import "./x.css"` statements are now resolved like any other module.
// Next handles these at build time; Next's own types only cover `*.module.css`.
declare module "*.css";
