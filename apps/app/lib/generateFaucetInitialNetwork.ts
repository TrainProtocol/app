import { ExtendedNetwork } from "@/Models/Network";
import { QueryParams } from "@/Models/QueryParams";

export function generateFaucetInitialNetwork(networks: ExtendedNetwork[], queryParams: QueryParams | null): ExtendedNetwork | null {
    const fromParam = queryParams?.from?.trim()
    if (!fromParam) return null
    return networks.find(n => n.caip2Id?.toUpperCase() === fromParam.toUpperCase()) ?? null
}
