import { NextRequest, NextResponse } from 'next/server'

/**
 * Beacon-API proxy for the Helios light client.
 *
 * A plain rewrite is not enough: publicnode's `/eth/v1/beacon/light_client/updates`
 * ignores `start_period`/`count` and returns its whole update cache (~200 entries
 * across mixed periods), which helios rejects with "invalid sync committee period".
 * This handler passes every route through untouched except `light_client/updates`,
 * which it filters down to the requested period window.
 */

const UPSTREAMS: Record<string, string> = {
    sepolia: 'https://ethereum-sepolia-beacon-api.publicnode.com',
    mainnet: 'https://ethereum-beacon-api.publicnode.com',
}

const SLOTS_PER_SYNC_COMMITTEE_PERIOD = 8192
const UPSTREAM_TIMEOUT_MS = 20_000

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ network: string; path: string[] }> },
) {
    const { network, path } = await params
    const upstream = UPSTREAMS[network]
    if (!upstream) return NextResponse.json({ error: 'Unknown network' }, { status: 404 })

    const pathname = path.join('/')
    const url = `${upstream}/${pathname}${request.nextUrl.search}`

    let response: Response
    try {
        response = await fetch(url, {
            headers: { accept: request.headers.get('accept') ?? 'application/json' },
            signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
            cache: 'no-store',
        })
    } catch {
        return NextResponse.json({ error: 'Beacon upstream unreachable' }, { status: 502 })
    }

    if (!pathname.endsWith('light_client/updates') || !response.ok) {
        return new NextResponse(response.body, {
            status: response.status,
            headers: { 'content-type': response.headers.get('content-type') ?? 'application/json' },
        })
    }

    const start = Number(request.nextUrl.searchParams.get('start_period') ?? 0)
    const count = Number(request.nextUrl.searchParams.get('count') ?? 128)
    let updates: Array<{ data?: { signature_slot?: string } }>
    try {
        updates = await response.json()
        if (!Array.isArray(updates)) throw new Error('not an array')
    } catch {
        return NextResponse.json({ error: 'Malformed updates response from upstream' }, { status: 502 })
    }

    const inWindow = updates
        .filter((u) => {
            const period = Math.floor(Number(u?.data?.signature_slot ?? 0) / SLOTS_PER_SYNC_COMMITTEE_PERIOD)
            return period >= start && period < start + count
        })
        .sort((a, b) => Number(a.data?.signature_slot) - Number(b.data?.signature_slot))

    return NextResponse.json(inWindow)
}
