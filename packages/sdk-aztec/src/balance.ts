import { AztecAddress } from '@aztec/aztec.js/addresses'
import { Fr } from '@aztec/aztec.js/fields'
import { createAztecNodeClient } from '@aztec/aztec.js/node'
import { deriveStorageSlotInMap } from '@aztec/stdlib/hash'

// Storage slot for public_balances map in the Token contract (slot 9 for standard Aztec token)
const TOKEN_PUBLIC_BALANCES_SLOT = new Fr(9n)

/**
 * Read the public token balance for an owner address by querying
 * the on-chain public storage directly. No wallet required.
 */
export async function getPublicTokenBalance(
    rpcUrl: string,
    tokenAddress: string,
    ownerAddress: string,
): Promise<bigint> {
    const client = createAztecNodeClient(rpcUrl)
    const tokenAddr = AztecAddress.fromString(tokenAddress)
    const owner = AztecAddress.fromString(ownerAddress)

    const slot = await deriveStorageSlotInMap(TOKEN_PUBLIC_BALANCES_SLOT, owner)
    const balanceField = await client.getPublicStorageAt('latest', tokenAddr, slot)
    return balanceField.toBigInt()
}
