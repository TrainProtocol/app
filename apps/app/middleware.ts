import { NextResponse } from "next/server"

export function middleware() {
    const res = NextResponse.next()
    res.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate")
    // Key the shared cache by Cookie so any future per-user SSR (auth, A/B, analytics id)
    // can't bleed across users. First-time visitors with no cookies still hit the shared entry.
    res.headers.set("Vary", "Cookie")

    // The passkey wallet derives a signing key from a WebAuthn assertion bound to
    // this origin. WebAuthn user verification mitigates passive theft, but the OS
    // prompt does not preview transaction details — a hostile parent could frame
    // the app and trick the user into clicking "Send" / confirming a passkey for
    // a transaction they did not intend. The passkey connector and auth dialog
    // are mounted globally, so any route can trigger a signing assertion; deny
    // framing across the entire app rather than just /wallet.
    res.headers.set("Content-Security-Policy", "frame-ancestors 'none'")
    res.headers.set("X-Frame-Options", "DENY")
    return res
}

export const config = {
    matcher: ["/((?!_next/|api/|.*\\..*).*)"],
}
