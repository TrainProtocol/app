import { describe, expect, it } from 'vitest'
import { isOrderReadyForSecretReveal } from '../verification/secret-reveal'

describe('isOrderReadyForSecretReveal', () => {
    it.each(['LPLocked', 'lp_locked', 'SolverLocked', 'Redeeming'])(
        'accepts %s',
        status => expect(isOrderReadyForSecretReveal(status)).toBe(true),
    )

    it.each([undefined, null, '', 'Created', 'LPLocking', 'Completed', 'Failed'])(
        'rejects %s',
        status => expect(isOrderReadyForSecretReveal(status)).toBe(false),
    )
})
