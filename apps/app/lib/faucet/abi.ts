export const FAUCET_ABI = [
    {
        type: 'function',
        name: 'mint',
        stateMutability: 'nonpayable',
        inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' },
        ],
        outputs: [],
    },
    {
        type: 'function',
        name: 'decimals',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint8' }],
    },
    {
        type: 'function',
        name: 'symbol',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'string' }],
    },
] as const
