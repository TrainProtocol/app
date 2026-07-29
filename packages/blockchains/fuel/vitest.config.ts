import path from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
    resolve: {
        alias: {
            '@train-protocol/sdk': path.resolve(__dirname, '../../sdk/src/index.ts'),
            '@train-protocol/auth': path.resolve(__dirname, '../../auth/src/index.ts'),
        },
    },
    test: {
        include: ['src/__tests__/**/*.test.ts'],
    },
})
