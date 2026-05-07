import { Network, Token } from "@train-protocol/sdk"

if (!process.env.NEXT_PUBLIC_TRAIN_API)
    throw new Error("NEXT_PUBLIC_TRAIN_API not provided")

const BASE_URL = process.env.NEXT_PUBLIC_TRAIN_API.replace(/\/$/, "")

export type FaucetToken = Token & { amount: string }

export type FaucetNetwork = Pick<Network, "caip2Id" | "displayName" | "networkType" | "logoUrl"> & {
    tokens: FaucetToken[]
}

export type FaucetClaimRequest = {
    caip2Id: string
    tokenContract: string
    recipientAddress: string
}

export type FaucetClaimStatus = {
    correlationId: string
    status: string
    txHash: string
    blockNumber: number
    failureReason: string
    networkSlug: string
}

export class FaucetApiError extends Error {
    override name = "FaucetApiError" as const
    constructor(message: string, public status: number) {
        super(message)
    }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${BASE_URL}/api/v1/faucet${path}`, {
        method,
        headers: {
            "Content-Type": "application/json",
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })

    if (!res.ok) {
        const text = await res.text().catch(() => res.statusText)
        throw new FaucetApiError(`${method} /faucet${path} failed (${res.status}): ${text}`, res.status)
    }

    return res.json() as Promise<T>
}

export async function getFaucetNetworks(): Promise<FaucetNetwork[]> {
    const json = await request<{ data?: FaucetNetwork[] | null }>("GET", "")
    return json.data ?? []
}

export async function claimFaucet(req: FaucetClaimRequest): Promise<{ correlationId: string }> {
    const json = await request<{ data?: { correlationId: string } | null }>("POST", "/claim", req)
    if (!json.data) throw new FaucetApiError("Empty claim response", 200)
    return json.data
}

export async function getClaimStatus(correlationId: string): Promise<FaucetClaimStatus> {
    const json = await request<{ data?: FaucetClaimStatus | null }>("GET", `/claim/${encodeURIComponent(correlationId)}`)
    if (!json.data) throw new FaucetApiError("Empty status response", 200)
    return json.data
}
