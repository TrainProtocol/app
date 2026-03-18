// ── Contract Opcodes (from Tact contract definitions) ───────────────────

/** User Lock — native TON (message opcode 0x1b564d91) */
export const USER_LOCK_OPCODE = 0x1b564d91

/** Solver Lock — native TON (message opcode 0x12e78cb1) */
export const LOCK_OPCODE = 0x12e78cb1


/** Redeem — reveal secret and claim (message opcode 0x758db085) */
export const REDEEM_OPCODE = 0x758db085

/** Refund — reclaim after timelock (message opcode 0xad821ef9) */
export const REFUND_OPCODE = 0xad821ef9

// ── Jetton-specific opcodes ─────────────────────────────────────────────

/** Standard Jetton transfer opcode */
export const JETTON_TRANSFER_OPCODE = 0x0f8a7ea5

/** UserLock via Jetton forward payload */
export const JETTON_USER_LOCK_OPCODE = 1734998782

/** Lock via Jetton forward payload */
export const JETTON_LOCK_OPCODE = 317164721

// ── Event opcodes (emitted by contract) ─────────────────────────────────

/** UserLocked event — native contract */
export const USER_LOCKED_NATIVE_OPCODE = 0x71f9f7aa

/** UserLocked event — Jetton contract */
export const USER_LOCKED_JETTON_OPCODE = 0xbf3d24d1

/** TokenLocked event — native contract */
export const TOKEN_LOCKED_NATIVE_OPCODE = 0x95b0219d

/** TokenLocked event — Jetton contract */
export const TOKEN_LOCKED_JETTON_OPCODE = 0x0f47e1b8

/** TokenRedeemed event */
export const TOKEN_REDEEMED_OPCODE = 0x6564cfc9

// ── Transaction defaults ────────────────────────────────────────────────

/** Transaction confirmation timeout in milliseconds */
export const TX_TIMEOUT = 120_000

/** Gas amount sent with write operations (in TON) */
export const GAS_AMOUNT = '0.2'

/** Validity window for TonConnect transactions (seconds from now) */
export const TX_VALIDITY_SECONDS = 360
