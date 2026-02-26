export function addressEquals(addr1: string | undefined | null, addr2: string | undefined | null): boolean {
    if (!addr1 || !addr2) return false
    return addr1.toLowerCase() === addr2.toLowerCase()
}
