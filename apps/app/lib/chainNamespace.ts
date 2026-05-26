/** Map app-level provider names to CAIP-2 chain namespaces used by @train-protocol packages */
const PROVIDER_TO_NAMESPACE: Record<string, string> = {
    evm: 'eip155',
    starknet: 'starknet',
    solana: 'solana',
    aztec: 'aztec',
    fuel: 'fuel',
    ton: 'ton',
    tron: 'tron',
}

export function toChainNamespace(providerName: string): string {
    const key = providerName.toLowerCase()
    return PROVIDER_TO_NAMESPACE[key] ?? key
}
