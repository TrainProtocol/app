import * as helios from './lib.mjs';
/**
 * Thin EIP-1193 bridge over the Helios light client. All network/config
 * knowledge and ABI encoding live on the main thread (lib/lightClient/) —
 * this worker only creates the provider and forwards verified RPC requests.
 *
 * Protocol (id-multiplexed request/response):
 *   main -> worker: { id, type: 'init', config, kind }
 *                   { id, type: 'waitSynced' }
 *                   { id, type: 'ethCall', to, data }
 *   worker -> main: { id, ok: true, result? } | { id, ok: false, error }
 */
let provider = null;
self.onmessage = async (event) => {
    const { id, type } = event.data ?? {};
    const reply = (message) => self.postMessage({ id, ...message });
    try {
        switch (type) {
            case 'init': {
                provider = await helios.createHeliosProvider(event.data.config, event.data.kind);
                return reply({ ok: true });
            }
            case 'waitSynced': {
                if (!provider)
                    throw new Error('Light client not initialized');
                await provider.waitSynced();
                return reply({ ok: true });
            }
            case 'ethCall': {
                if (!provider)
                    throw new Error('Light client not initialized');
                await provider.waitSynced();
                const result = await provider.request({
                    method: 'eth_call',
                    params: [{ to: event.data.to, data: event.data.data }, 'latest'],
                });
                return reply({ ok: true, result });
            }
            default:
                return reply({ ok: false, error: `Unknown message type: ${String(type)}` });
        }
    }
    catch (err) {
        reply({ ok: false, error: err instanceof Error ? err.message : String(err) });
    }
};
