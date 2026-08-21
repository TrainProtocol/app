// An Aztec address is a BN254 field element (Fr). Values at or above the modulus
// silently wrap when parsed, so they are not the address the user typed.
const FR_MODULUS = 0x30644e72e131a029b85045b68181585d2833e84879b9709143e1f593f0000001n

const HEX_64 = /^(0x)?[0-9a-fA-F]{64}$/

const normalize = (address: string) => (address.startsWith("0x") ? address : `0x${address}`)

export function isValidAztecAddress(address: string | null | undefined): boolean {
    if (!address || !HEX_64.test(address)) return false
    return BigInt(normalize(address)) < FR_MODULUS
}
