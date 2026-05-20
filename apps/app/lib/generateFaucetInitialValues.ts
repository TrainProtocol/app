import { ExtendedNetwork } from "@/Models/Network";
import { QueryParams } from "@/Models/QueryParams";
import { Address } from "@/lib/address";

export function generateFaucetInitialValues(
    networks: ExtendedNetwork[],
    queryParams: QueryParams | null,
): { network: ExtendedNetwork | null; recipient: string | null } {
    const fromParam = queryParams?.from?.trim()
    const network = fromParam ? networks.find(n => n.caip2Id?.toUpperCase() === fromParam.toUpperCase()) ?? null : null

    let recipient: string | null = null
    const sourceAddress = queryParams?.sourceAddress?.trim()
    if (sourceAddress && network && Address.isValid(sourceAddress, network)) {
        recipient = sourceAddress
    }

    return { network, recipient }
}
