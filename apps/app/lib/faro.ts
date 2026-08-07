import { getWebInstrumentations, initializeFaro, type Faro } from '@grafana/faro-web-sdk';
import { ReactIntegration } from '@grafana/faro-react';
import { TracingInstrumentation } from '@grafana/faro-web-tracing';
import { IsExtensionError } from '../helpers/errorHelper';

let faro: Faro | null = null;

export function initFaro(): Faro | undefined {
    if (typeof window === 'undefined') return;

    const collectorUrl = process.env.NEXT_PUBLIC_FARO_COLLECTOR_URL;
    if (!collectorUrl) return;

    const sampleRateRaw = process.env.NEXT_PUBLIC_FARO_SAMPLE_RATE;
    const sampleRate = sampleRateRaw ? Number(sampleRateRaw) : 1;

    const instance = initializeFaro({
        url: collectorUrl,
        app: {
            name: 'train-app',
            version: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || 'local',
            environment: process.env.NEXT_PUBLIC_API_VERSION || 'sandbox',
        },
        sessionTracking: {
            enabled: true,
            persistent: true,
            samplingRate: Number.isFinite(sampleRate) ? sampleRate : 1,
        },
        beforeSend: (item) => {
            if (item?.type === 'exception') {
                const payload = item.payload as { value?: string; stacktrace?: { frames?: { filename?: string }[] } };
                const value = payload?.value ?? '';
                if (value.includes('ResizeObserver loop')) return null;
                const pseudoStack = payload?.stacktrace?.frames?.map(f => f.filename).filter(Boolean).join('\n') ?? '';
                if (IsExtensionError({ message: value, stack: pseudoStack } as Error)) return null;
            }
            return item;
        },
        instrumentations: [
            ...getWebInstrumentations({
                captureConsole: true,
            }),
            new ReactIntegration(),
            new TracingInstrumentation(),
        ],
    });

    faro = instance;
    return instance;
}

export function getFaro(): Faro | null {
    return faro;
}

export function captureException(error: unknown, context?: Record<string, unknown>) {
    const f = getFaro();
    if (!f) return;

    const err = error instanceof Error ? error : new Error(String(error));
    f.api.pushError(err, {
        context: context ? flattenContext(context) : undefined,
    });
}

export function captureEvent(name: string, attributes?: Record<string, unknown>) {
    const f = getFaro();
    if (!f) return;

    f.api.pushEvent(name, attributes ? flattenContext(attributes) : undefined);
}

export function setView(name: string) {
    const f = getFaro();
    if (!f) return;
    f.api.setView({ name });
}

export type SwapContextAttrs = {
    hashlock?: string;
    source_network?: string;
    destination_network?: string;
    source_asset?: string;
    destination_asset?: string;
    user_address?: string;
};

export function setSwapContext(attrs: SwapContextAttrs) {
    const f = getFaro();
    if (!f) return;
    f.api.setSession({ attributes: flattenContext(attrs as Record<string, unknown>) });
}

export function clearSwapContext() {
    const f = getFaro();
    if (!f) return;
    f.api.setSession({ attributes: {} });
}

function flattenContext(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(obj)) {
        if (value === undefined || value === null) continue;
        const outKey = prefix ? `${prefix}.${key}` : key;
        if (Array.isArray(value)) {
            result[outKey] = value.map(v => (v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v))).join(',');
        } else if (typeof value === 'object') {
            Object.assign(result, flattenContext(value as Record<string, unknown>, outKey));
        } else {
            result[outKey] = String(value);
        }
    }
    return result;
}
