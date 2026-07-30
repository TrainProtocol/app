import { NextResponse, type NextRequest } from "next/server"

export function middleware(_req: NextRequest) {
    const res = NextResponse.next()
    res.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate")
    // Key the shared cache by Cookie so any future per-user SSR (auth, A/B, analytics id)
    // can't bleed across users. First-time visitors with no cookies still hit the shared entry.
    res.headers.set("Vary", "Cookie")
    return res
}

export const config = {
    matcher: ["/((?!_next/|api/|.*\\..*).*)"],
}
