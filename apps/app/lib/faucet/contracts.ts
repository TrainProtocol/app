export type FaucetContract = {
    caip2Id: string
    faucetAddress: `0x${string}`
}

export const FAUCET_CONTRACTS: FaucetContract[] = [
    { caip2Id: 'eip155:11155111', faucetAddress: '0xE123873E14759F86d9801D5509cEb0a777C99BB9' },
    { caip2Id: 'eip155:84532', faucetAddress: '0xE123873E14759F86d9801D5509cEb0a777C99BB9' },
    { caip2Id: 'eip155:421614', faucetAddress: '0xE123873E14759F86d9801D5509cEb0a777C99BB9' },
    { caip2Id: 'eip155:10143', faucetAddress: '0xE123873E14759F86d9801D5509cEb0a777C99BB9' },
]
