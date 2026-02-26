const formatAmount = (unformattedAmount: bigint | unknown, decimals: number | undefined): number => {
    return (Number(BigInt(String((unformattedAmount as any) ?? 0))) / Math.pow(10, decimals || 18))
}

export default formatAmount
