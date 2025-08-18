import { useState, useEffect } from 'react';
import { aztecNodeUrl } from '../lib/wallets/aztec/configs'
export interface AztecSDKType {
  connect: (connectorId: string) => Promise<void>;
  disconnect: () => Promise<void>;
  getAccount: () => any;
  connectors: any[];
}

export function useAztecSDK() {
  const [sdk, setSdk] = useState<AztecSDKType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function initializeSDK() {
      try {
        // Dynamic import of the nemi-fi package
        const { AztecWalletSdk, obsidion } = await import('../lib/@nemi-fi/wallet-sdk/src/exports/index.ts');

        if (!mounted) return;

        const initializedSDK = new AztecWalletSdk({
          aztecNode: aztecNodeUrl,
          connectors: [obsidion()],
        });

        setSdk(initializedSDK as any);
        setError(null);
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to initialize Aztec SDK'));
          console.error('Error initializing Aztec SDK:', err);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    // Initialize after page load
    if (typeof window !== 'undefined') {
      // Use requestIdleCallback if available, otherwise setTimeout
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(initializeSDK);
      } else {
        setTimeout(initializeSDK, 0);
      }
    } else {
      initializeSDK();
    }

    return () => {
      mounted = false;
    };
  }, []);

  return {
    sdk,
    isLoading,
    error,
    isReady: !isLoading && !error && sdk !== null,
  };
}