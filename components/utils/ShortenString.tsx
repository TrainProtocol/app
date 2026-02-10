/**
 * Shortens a generic string (for transaction hashes, etc.)
 * For blockchain addresses, use Address class methods instead
 * @param str - String to shorten
 * @returns Shortened string (e.g., "0x123...5678")
 */
export default function shortenString(str: string): string {
  if (!str || str.length < 13) return str;
  return `${str.substring(0, 5)}...${str.substring(str.length - 4)}`;
}
