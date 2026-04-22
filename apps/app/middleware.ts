import { NextResponse, type NextRequest } from "next/server"

export function middleware(_req: NextRequest) {
    const res = NextResponse.next()
    res.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate")
    return res
}

export const config = {
    matcher: ["/((?!_next/|api/|.*\\..*).*)"],
}
