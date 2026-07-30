// Redirects visitors whose browser blocks storage (cookies disabled, some
// embedded/third-party contexts) to /nocookies before anything touches
// localStorage and throws.
//
// This used to be an inline <script> in the document <head>. React 19 warns on
// <script> elements rendered by components — they never execute on a client
// render — so the guard lives in the client bundle instead. Importing this
// module for its side effect at the top of providers.tsx means it evaluates
// before the provider tree and before the SDK registrations, which are the
// things that would actually crash on blocked storage.
if (typeof window !== "undefined" && !window.location.pathname.includes("nocookies")) {
    try {
        localStorage.getItem("ls-ls-test")
    } catch {
        window.location.href = "/nocookies"
    }
}

export { }
