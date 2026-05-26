import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
    resolve: {
        alias: {
            '@train-protocol/sdk': path.resolve(__dirname, '../../sdk/src/index.ts'),
        },
    },
    test: {
        include: ['src/__tests__/**/*.test.ts'],
    },
})
