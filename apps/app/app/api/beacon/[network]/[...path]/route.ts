import { NextRequest, NextResponse } from 'next/server'

/**
 * Beacon-API proxy for the Helios light client.
 *
 * A plain rewrite is not enough: publicnode's `/eth/v1/beacon/light_client/updates`
 * ignores `start_period`/`count` and returns its whole update cache — ~213 entries
 * spanning mixed periods, ~12 MB — even when asked for a single period, which
 * helios rejects with "invalid sync committee period". This handler passes every
 * route through untouched except `light_client/updates`, which it filters down to
 * the requested period window.
 *
 * Because that upstream response is ~210x larger than the 1-3 entries any request
 * actually needs, it is not re-fetched per request. Entries are cached per period
 * (they are finalized history once their period completes) and the filtered
 * response carries `Cache-Control` so the edge absorbs repeats without invoking
 * this function at all.
 */

const UPSTREAMS: Record<string, string> = {
    sepolia: 'https://ethereum-sepolia-beacon-api.publicnode.com',
    mainnet: 'https://ethereum-beacon-api.publicnode.com',
}

const SLOTS_PER_SYNC_COMMITTEE_PERIOD = 8192
/** Beacon spec `MAX_REQUEST_LIGHT_CLIENT_UPDATES` — the window when the caller names none. */
const DEFAULT_UPDATE_COUNT = 128
const UPSTREAM_TIMEOUT_MS = 20_000
/** Guard against an upstream that streams without end; publicnode's cache is ~12 MB. */
const MAX_UPDATES_BYTES = 32 * 1024 * 1024
/** Helios only ever walks the last few periods; this is ~36 days of them. */
const MAX_CACHED_PERIODS = 32
/** How long a populated cache may answer before we re-check upstream for a new period. */
const CACHE_TTL_MS = 60_000

/** A window entirely below the newest known period is finalized history. */
const COMPLETED_WINDOW_CACHE = 'public, s-maxage=86400, stale-while-revalidate=86400'
/** A window touching the newest period can still gain a better-participation update. */
const CURRENT_WINDOW_CACHE = 'public, s-maxage=60, stale-while-revalidate=600'

interface LightClientUpdate {
    data?: {
        signature_slot?: string
        attested_header?: { beacon?: { slot?: string } }
    }
}

/** `${network}:${period}` → update. Insertion-ordered, oldest period evicted first. */
const updateCache = new Map<string, LightClientUpdate>()
const lastFetchedAt = new Map<string, number>()
const newestPeriod = new Map<string, number>()

/**
 * The spec addresses updates by the period of `attested_header.beacon.slot`.
 * `signature_slot` is at least one slot later and can land in the next period at
 * a boundary, which would file the update under the wrong key — and, once cached,
 * serve it for a window it does not belong to.
 */
function periodOf(update: LightClientUpdate): number | null {
    const slot = update?.data?.attested_header?.beacon?.slot ?? update?.data?.signature_slot
    const parsed = Number(slot)
    return Number.isFinite(parsed) ? Math.floor(parsed / SLOTS_PER_SYNC_COMMITTEE_PERIOD) : null
}

function rememberUpdates(network: string, updates: LightClientUpdate[]): void {
    const byPeriod = new Map<number, LightClientUpdate>()
    for (const update of updates) {
        const period = periodOf(update)
        if (period !== null) byPeriod.set(period, update)
    }
    if (!byPeriod.size) return

    // Insert ascending so LRU eviction keeps the newest periods — the only ones
    // helios ever asks for.
    for (const period of [...byPeriod.keys()].sort((a, b) => a - b)) {
        const key = `${network}:${period}`
        updateCache.delete(key)
        updateCache.set(key, byPeriod.get(period)!)
    }
    while (updateCache.size > MAX_CACHED_PERIODS) {
        const oldest = updateCache.keys().next().value
        if (oldest === undefined) break
        updateCache.delete(oldest)
    }

    newestPeriod.set(network, Math.max(...byPeriod.keys()))
    lastFetchedAt.set(network, Date.now())
}

/** Ascending by period, one entry per period — the order helios verifies in. */
function selectWindow(updates: LightClientUpdate[], start: number, count: number): LightClientUpdate[] {
    const byPeriod = new Map<number, LightClientUpdate>()
    for (const update of updates) {
        const period = periodOf(update)
        if (period !== null && period >= start && period < start + count) byPeriod.set(period, update)
    }
    return [...byPeriod.keys()].sort((a, b) => a - b).map(period => byPeriod.get(period)!)
}

function readWindow(network: string, start: number, count: number): LightClientUpdate[] {
    const window: LightClientUpdate[] = []
    for (let period = start; period < start + count; period++) {
        const hit = updateCache.get(`${network}:${period}`)
        if (hit) window.push(hit)
    }
    return window
}

/** Buffer a JSON body with a hard byte ceiling, so a broken upstream can't exhaust the function. */
async function readJsonCapped(response: Response, maxBytes: number): Promise<unknown> {
    const reader = response.body?.getReader()
    if (!reader) throw new Error('Upstream returned no body')

    const chunks: Uint8Array[] = []
    let total = 0
    while (true) {
        const { done, value } = await reader.read()
        if (done) break
        total += value.length
        if (total > maxBytes) {
            await reader.cancel()
            throw new Error(`Upstream response exceeded ${maxBytes} bytes`)
        }
        chunks.push(value)
    }

    const body = new Uint8Array(total)
    let offset = 0
    for (const chunk of chunks) {
        body.set(chunk, offset)
        offset += chunk.length
    }
    return JSON.parse(new TextDecoder().decode(body))
}

function windowResponse(network: string, window: LightClientUpdate[], start: number, count: number) {
    const known = newestPeriod.get(network)
    const historical = known !== undefined && start + count - 1 < known
    return NextResponse.json(window, {
        headers: { 'cache-control': historical ? COMPLETED_WINDOW_CACHE : CURRENT_WINDOW_CACHE },
    })
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ network: string; path: string[] }> },
) {
    const { network, path } = await params
    if (!Object.hasOwn(UPSTREAMS, network)) {
        return NextResponse.json({ error: 'Unknown network' }, { status: 404 })
    }
    const upstream = UPSTREAMS[network]

    const pathname = path.join('/')
    const isUpdates = pathname.endsWith('light_client/updates')

    // Non-finite params would make every period comparison false and silently
    // return an empty window, which helios cannot distinguish from a real miss.
    const rawStart = request.nextUrl.searchParams.get('start_period')
    const rawCount = request.nextUrl.searchParams.get('count')
    const start = rawStart === null ? 0 : Number(rawStart)
    const count = rawCount === null ? DEFAULT_UPDATE_COUNT : Number(rawCount)
    if (isUpdates && (!Number.isInteger(start) || !Number.isInteger(count) || start < 0 || count <= 0)) {
        return NextResponse.json({ error: 'Invalid start_period or count' }, { status: 400 })
    }

    // Serve the window from cache while it is fresh: the upstream payload is ~210x
    // the size of the answer, so re-fetching it per request is the whole problem.
    if (isUpdates) {
        const fetchedAt = lastFetchedAt.get(network) ?? 0
        const cached = readWindow(network, start, count)
        if (Date.now() - fetchedAt < CACHE_TTL_MS && cached.length) {
            return windowResponse(network, cached, start, count)
        }
    }

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

    if (!isUpdates || !response.ok) {
        return new NextResponse(response.body, {
            status: response.status,
            headers: { 'content-type': response.headers.get('content-type') ?? 'application/json' },
        })
    }

    let updates: unknown
    try {
        updates = await readJsonCapped(response, MAX_UPDATES_BYTES)
        if (!Array.isArray(updates)) throw new Error('not an array')
    } catch {
        return NextResponse.json({ error: 'Malformed updates response from upstream' }, { status: 502 })
    }

    // Answer from what we just fetched, not from the cache: `rememberUpdates`
    // evicts down to the newest periods, so a window below that cut would come
    // back empty even though upstream just handed us the entries.
    rememberUpdates(network, updates as LightClientUpdate[])
    return windowResponse(network, selectWindow(updates as LightClientUpdate[], start, count), start, count)
}
