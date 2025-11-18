export interface RpcValidationResult {
    isValid: boolean
    error?: string
}

/**
 * Validates an RPC URL format and optionally tests connectivity
 * @param url The RPC URL to validate
 * @param testConnection Whether to test the connection (optional)
 * @returns Validation result with isValid flag and error message if invalid
 */
export async function validateRpcUrl(
    url: string,
    testConnection: boolean = false
): Promise<RpcValidationResult> {
    // Check if URL is provided
    if (!url || url.trim() === "") {
        return {
            isValid: false,
            error: "RPC URL is required"
        }
    }

    // Basic URL format validation
    try {
        const parsedUrl = new URL(url)

        // Check for valid protocols
        if (!["http:", "https:", "ws:", "wss:"].includes(parsedUrl.protocol)) {
            return {
                isValid: false,
                error: "Invalid protocol. Use http://, https://, ws://, or wss://"
            }
        }

        // Check for localhost/127.0.0.1 in production (optional)
        if (process.env.NODE_ENV === "production") {
            if (parsedUrl.hostname === "localhost" || parsedUrl.hostname === "127.0.0.1") {
                // Allow localhost in production but show warning
                console.warn("Using localhost RPC in production environment")
            }
        }

        // Validate hostname
        if (!parsedUrl.hostname) {
            return {
                isValid: false,
                error: "Invalid hostname"
            }
        }

        // Optional: Test actual RPC connection
        if (testConnection) {
            try {
                const testResult = await testRpcConnection(url)
                if (!testResult.success) {
                    return {
                        isValid: false,
                        error: testResult.error || "Failed to connect to RPC endpoint"
                    }
                }
            } catch (error) {
                return {
                    isValid: false,
                    error: "Failed to test RPC connection"
                }
            }
        }

        return {
            isValid: true
        }
    } catch (error) {
        return {
            isValid: false,
            error: "Invalid URL format"
        }
    }
}

/**
 * Tests if an RPC endpoint is responsive by making a simple JSON-RPC call
 * @param url The RPC URL to test
 * @returns Test result with success flag and error message if failed
 */
async function testRpcConnection(url: string): Promise<{ success: boolean; error?: string }> {
    try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000) // 5 second timeout

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                jsonrpc: "2.0",
                method: "eth_chainId", // Simple method that should work on all EVM chains
                params: [],
                id: 1
            }),
            signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
            return {
                success: false,
                error: `HTTP ${response.status}: ${response.statusText}`
            }
        }

        const data = await response.json()

        // Check if we got a valid JSON-RPC response
        if (data.jsonrpc !== "2.0") {
            return {
                success: false,
                error: "Invalid JSON-RPC response"
            }
        }

        // Check if there's an error in the response
        if (data.error) {
            return {
                success: false,
                error: `RPC Error: ${data.error.message || "Unknown error"}`
            }
        }

        // Check if we got a result (chainId)
        if (!data.result) {
            return {
                success: false,
                error: "No result from RPC call"
            }
        }

        return {
            success: true
        }
    } catch (error: any) {
        if (error.name === "AbortError") {
            return {
                success: false,
                error: "Connection timeout"
            }
        }
        return {
            success: false,
            error: error.message || "Connection failed"
        }
    }
}

/**
 * Validates multiple RPC URLs and returns the first valid one
 * @param urls Array of RPC URLs to validate
 * @param testConnection Whether to test connections
 * @returns The first valid URL or null if none are valid
 */
export async function findFirstValidRpcUrl(
    urls: string[],
    testConnection: boolean = false
): Promise<string | null> {
    for (const url of urls) {
        const result = await validateRpcUrl(url, testConnection)
        if (result.isValid) {
            return url
        }
    }
    return null
}

/**
 * Sanitizes an RPC URL by trimming whitespace and ensuring proper format
 * @param url The URL to sanitize
 * @returns Sanitized URL
 */
export function sanitizeRpcUrl(url: string): string {
    return url.trim()
}