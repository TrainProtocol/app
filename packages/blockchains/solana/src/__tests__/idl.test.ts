import { describe, expect, it } from 'vitest'
import { TrainHtlc } from '../idl/trainHtlc'

describe('Solana Train HTLC IDL', () => {
    it('uses the deployed address supplied by Station', () => {
        const address = '11111111111111111111111111111111'
        expect(TrainHtlc(address).address).toBe(address)
    })

    it('contains the EVM-parity user-lock schema', () => {
        const idl = TrainHtlc('11111111111111111111111111111111')
        const instruction = idl.instructions.find(ix => ix.name === 'user_lock_token')

        expect(instruction?.args.map(arg => arg.name)).toEqual([
            'params',
            'user_data',
            'solver_data',
        ])
        expect(instruction?.accounts.map(account => account.name)).toEqual([
            'payer',
            'sender',
            'user_lock',
            'token_mint',
            'sender_token_account',
            'vault',
            'payout_curve_program',
            'token_program',
            'system_program',
            'rent',
        ])
    })

    it('contains the separate-reward solver redeem path', () => {
        const idl = TrainHtlc('11111111111111111111111111111111')
        expect(idl.instructions.some(ix => ix.name === 'redeem_solver_token_diff_reward')).toBe(true)
    })
})
