import type { Idl } from '@coral-xyz/anchor'

const TRAIN_HTLC_IDL: Idl = {
  "address": "2cQYFAiud2LBg3r6MxKPJ1oS83yyrRwDsgxQSwhL97LJ",
  "metadata": {
    "name": "train_htlc",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Train HTLC program for cross-chain atomic swaps"
  },
  "instructions": [
    {
      "name": "close_consumed_intent",
      "discriminator": [
        3,
        169,
        13,
        149,
        69,
        230,
        224,
        99
      ],
      "accounts": [
        {
          "name": "caller",
          "signer": true
        },
        {
          "name": "consumed_intent",
          "writable": true
        },
        {
          "name": "rent_payer",
          "writable": true
        }
      ],
      "args": []
    },
    {
      "name": "close_solver_lock",
      "discriminator": [
        155,
        212,
        31,
        231,
        73,
        217,
        169,
        229
      ],
      "accounts": [
        {
          "name": "caller",
          "writable": true,
          "signer": true
        },
        {
          "name": "solver_lock",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  108,
                  118,
                  101,
                  114,
                  95,
                  108,
                  111,
                  99,
                  107
                ]
              },
              {
                "kind": "arg",
                "path": "_hashlock"
              },
              {
                "kind": "arg",
                "path": "_solver"
              }
            ]
          }
        },
        {
          "name": "rent_payer",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "hashlock",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "solver",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "get_solver_lock",
      "discriminator": [
        112,
        193,
        20,
        65,
        13,
        198,
        117,
        75
      ],
      "accounts": [
        {
          "name": "solver_lock",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  108,
                  118,
                  101,
                  114,
                  95,
                  108,
                  111,
                  99,
                  107
                ]
              },
              {
                "kind": "arg",
                "path": "_hashlock"
              },
              {
                "kind": "arg",
                "path": "_solver"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "hashlock",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "solver",
          "type": "pubkey"
        }
      ],
      "returns": {
        "defined": {
          "name": "SolverLockData"
        }
      }
    },
    {
      "name": "get_user_lock",
      "discriminator": [
        160,
        232,
        28,
        5,
        133,
        31,
        165,
        226
      ],
      "accounts": [
        {
          "name": "user_lock",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  108,
                  111,
                  99,
                  107
                ]
              },
              {
                "kind": "arg",
                "path": "_hashlock"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "hashlock",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ],
      "returns": {
        "defined": {
          "name": "UserLockData"
        }
      }
    },
    {
      "name": "initialize_intent_domain",
      "discriminator": [
        228,
        18,
        154,
        8,
        118,
        10,
        81,
        231
      ],
      "accounts": [
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "intent_domain",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  116,
                  101,
                  110,
                  116,
                  95,
                  100,
                  111,
                  109,
                  97,
                  105,
                  110
                ]
              }
            ]
          }
        },
        {
          "name": "program",
          "docs": [
            "The salt is the cross-cluster replay barrier, so only the program upgrade",
            "authority may set it \u2014 once, before finalizing the upgrade authority.",
            "Genesis-loaded programs (anchor/solana test validators only) carry",
            "Some(Pubkey::default()) as their authority; real deployments via the",
            "upgradeable loader always record the deployer, so the default-pubkey branch",
            "is unreachable on devnet/mainnet."
          ],
          "address": "2cQYFAiud2LBg3r6MxKPJ1oS83yyrRwDsgxQSwhL97LJ"
        },
        {
          "name": "program_data"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "salt",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "redeem_solver_sol",
      "discriminator": [
        158,
        244,
        167,
        180,
        50,
        185,
        114,
        43
      ],
      "accounts": [
        {
          "name": "caller",
          "writable": true,
          "signer": true
        },
        {
          "name": "solver_lock",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  108,
                  118,
                  101,
                  114,
                  95,
                  108,
                  111,
                  99,
                  107
                ]
              },
              {
                "kind": "arg",
                "path": "hashlock"
              },
              {
                "kind": "arg",
                "path": "solver"
              }
            ]
          }
        },
        {
          "name": "recipient",
          "writable": true
        },
        {
          "name": "reward_recipient",
          "docs": [
            "lock carries a reward; zero-reward locks store the default pubkey)"
          ],
          "writable": true
        },
        {
          "name": "refund_to",
          "writable": true
        },
        {
          "name": "payout_curve_program",
          "optional": true
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "hashlock",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "solver",
          "type": "pubkey"
        },
        {
          "name": "secret",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "redeem_solver_sol_token_reward",
      "discriminator": [
        80,
        135,
        99,
        36,
        3,
        172,
        15,
        178
      ],
      "accounts": [
        {
          "name": "caller",
          "writable": true,
          "signer": true
        },
        {
          "name": "solver_lock",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  108,
                  118,
                  101,
                  114,
                  95,
                  108,
                  111,
                  99,
                  107
                ]
              },
              {
                "kind": "arg",
                "path": "hashlock"
              },
              {
                "kind": "arg",
                "path": "solver"
              }
            ]
          }
        },
        {
          "name": "rent_payer",
          "writable": true
        },
        {
          "name": "recipient",
          "writable": true
        },
        {
          "name": "reward_recipient"
        },
        {
          "name": "refund_to",
          "writable": true
        },
        {
          "name": "reward_token_mint"
        },
        {
          "name": "reward_vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  108,
                  118,
                  101,
                  114,
                  95,
                  114,
                  101,
                  119,
                  97,
                  114,
                  100,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "hashlock"
              },
              {
                "kind": "arg",
                "path": "solver"
              }
            ]
          }
        },
        {
          "name": "reward_recipient_token_account",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "reward_recipient"
              },
              {
                "kind": "account",
                "path": "token_program"
              },
              {
                "kind": "account",
                "path": "reward_token_mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "caller_reward_token_account",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "caller"
              },
              {
                "kind": "account",
                "path": "token_program"
              },
              {
                "kind": "account",
                "path": "reward_token_mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "payout_curve_program",
          "optional": true
        },
        {
          "name": "token_program"
        },
        {
          "name": "associated_token_program",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "hashlock",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "solver",
          "type": "pubkey"
        },
        {
          "name": "secret",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "redeem_solver_token",
      "discriminator": [
        198,
        1,
        109,
        168,
        143,
        32,
        179,
        249
      ],
      "accounts": [
        {
          "name": "caller",
          "writable": true,
          "signer": true
        },
        {
          "name": "solver_lock",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  108,
                  118,
                  101,
                  114,
                  95,
                  108,
                  111,
                  99,
                  107
                ]
              },
              {
                "kind": "arg",
                "path": "hashlock"
              },
              {
                "kind": "arg",
                "path": "solver"
              }
            ]
          }
        },
        {
          "name": "rent_payer",
          "docs": [
            "solver_lock.rent_payer"
          ],
          "writable": true
        },
        {
          "name": "recipient"
        },
        {
          "name": "reward_recipient",
          "docs": [
            "lock carries a reward; zero-reward locks store the default pubkey)"
          ]
        },
        {
          "name": "refund_to"
        },
        {
          "name": "token_mint"
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  108,
                  118,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "hashlock"
              },
              {
                "kind": "arg",
                "path": "solver"
              }
            ]
          }
        },
        {
          "name": "recipient_token_account",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "recipient"
              },
              {
                "kind": "account",
                "path": "token_program"
              },
              {
                "kind": "account",
                "path": "token_mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "reward_recipient_token_account",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "reward_recipient"
              },
              {
                "kind": "account",
                "path": "token_program"
              },
              {
                "kind": "account",
                "path": "token_mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "caller_token_account",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "caller"
              },
              {
                "kind": "account",
                "path": "token_program"
              },
              {
                "kind": "account",
                "path": "token_mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "refund_to_token_account",
          "docs": [
            "Required only when the lock has a payout curve (receives the excess)."
          ],
          "writable": true,
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "refund_to"
              },
              {
                "kind": "account",
                "path": "token_program"
              },
              {
                "kind": "account",
                "path": "token_mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "payout_curve_program",
          "optional": true
        },
        {
          "name": "token_program"
        },
        {
          "name": "associated_token_program",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "hashlock",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "solver",
          "type": "pubkey"
        },
        {
          "name": "secret",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "redeem_solver_token_diff_reward",
      "discriminator": [
        95,
        153,
        26,
        142,
        42,
        33,
        204,
        17
      ],
      "accounts": [
        {
          "name": "caller",
          "writable": true,
          "signer": true
        },
        {
          "name": "solver_lock",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  108,
                  118,
                  101,
                  114,
                  95,
                  108,
                  111,
                  99,
                  107
                ]
              },
              {
                "kind": "arg",
                "path": "hashlock"
              },
              {
                "kind": "arg",
                "path": "solver"
              }
            ]
          }
        },
        {
          "name": "rent_payer",
          "docs": [
            "solver_lock.rent_payer"
          ],
          "writable": true
        },
        {
          "name": "recipient"
        },
        {
          "name": "reward_recipient",
          "docs": [
            "lock carries a reward; zero-reward locks store the default pubkey)"
          ]
        },
        {
          "name": "refund_to"
        },
        {
          "name": "token_mint"
        },
        {
          "name": "reward_token_mint"
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  108,
                  118,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "hashlock"
              },
              {
                "kind": "arg",
                "path": "solver"
              }
            ]
          }
        },
        {
          "name": "reward_vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  108,
                  118,
                  101,
                  114,
                  95,
                  114,
                  101,
                  119,
                  97,
                  114,
                  100,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "hashlock"
              },
              {
                "kind": "arg",
                "path": "solver"
              }
            ]
          }
        },
        {
          "name": "recipient_token_account",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "recipient"
              },
              {
                "kind": "account",
                "path": "token_program"
              },
              {
                "kind": "account",
                "path": "token_mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "reward_recipient_token_account",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "reward_recipient"
              },
              {
                "kind": "account",
                "path": "token_program"
              },
              {
                "kind": "account",
                "path": "reward_token_mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "caller_reward_token_account",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "caller"
              },
              {
                "kind": "account",
                "path": "token_program"
              },
              {
                "kind": "account",
                "path": "reward_token_mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "refund_to_token_account",
          "docs": [
            "Required only when the lock has a payout curve (receives the excess)."
          ],
          "writable": true,
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "refund_to"
              },
              {
                "kind": "account",
                "path": "token_program"
              },
              {
                "kind": "account",
                "path": "token_mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "payout_curve_program",
          "optional": true
        },
        {
          "name": "token_program"
        },
        {
          "name": "associated_token_program",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "hashlock",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "solver",
          "type": "pubkey"
        },
        {
          "name": "secret",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "redeem_solver_token_sol_reward",
      "discriminator": [
        129,
        220,
        219,
        158,
        78,
        106,
        122,
        49
      ],
      "accounts": [
        {
          "name": "caller",
          "writable": true,
          "signer": true
        },
        {
          "name": "solver_lock",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  108,
                  118,
                  101,
                  114,
                  95,
                  108,
                  111,
                  99,
                  107
                ]
              },
              {
                "kind": "arg",
                "path": "hashlock"
              },
              {
                "kind": "arg",
                "path": "solver"
              }
            ]
          }
        },
        {
          "name": "rent_payer",
          "writable": true
        },
        {
          "name": "recipient"
        },
        {
          "name": "reward_recipient",
          "writable": true
        },
        {
          "name": "refund_to"
        },
        {
          "name": "token_mint"
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  108,
                  118,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "hashlock"
              },
              {
                "kind": "arg",
                "path": "solver"
              }
            ]
          }
        },
        {
          "name": "recipient_token_account",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "recipient"
              },
              {
                "kind": "account",
                "path": "token_program"
              },
              {
                "kind": "account",
                "path": "token_mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "refund_to_token_account",
          "docs": [
            "Required only when the lock has a payout curve."
          ],
          "writable": true,
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "refund_to"
              },
              {
                "kind": "account",
                "path": "token_program"
              },
              {
                "kind": "account",
                "path": "token_mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "payout_curve_program",
          "optional": true
        },
        {
          "name": "token_program"
        },
        {
          "name": "associated_token_program",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "hashlock",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "solver",
          "type": "pubkey"
        },
        {
          "name": "secret",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "redeem_user_sol",
      "discriminator": [
        63,
        101,
        248,
        158,
        196,
        124,
        156,
        183
      ],
      "accounts": [
        {
          "name": "caller",
          "writable": true,
          "signer": true
        },
        {
          "name": "user_lock",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  108,
                  111,
                  99,
                  107
                ]
              },
              {
                "kind": "arg",
                "path": "hashlock"
              }
            ]
          }
        },
        {
          "name": "rent_payer",
          "writable": true
        },
        {
          "name": "recipient",
          "writable": true
        },
        {
          "name": "refund_to",
          "writable": true
        },
        {
          "name": "payout_curve_program",
          "docs": [
            "user_lock.payout_curve. Required when the lock has a curve."
          ],
          "optional": true
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "hashlock",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "secret",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "redeem_user_token",
      "discriminator": [
        29,
        218,
        215,
        128,
        14,
        81,
        152,
        69
      ],
      "accounts": [
        {
          "name": "caller",
          "writable": true,
          "signer": true
        },
        {
          "name": "user_lock",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  108,
                  111,
                  99,
                  107
                ]
              },
              {
                "kind": "arg",
                "path": "hashlock"
              }
            ]
          }
        },
        {
          "name": "rent_payer",
          "writable": true
        },
        {
          "name": "recipient"
        },
        {
          "name": "refund_to"
        },
        {
          "name": "token_mint"
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "hashlock"
              }
            ]
          }
        },
        {
          "name": "recipient_token_account",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "recipient"
              },
              {
                "kind": "account",
                "path": "token_program"
              },
              {
                "kind": "account",
                "path": "token_mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "refund_to_token_account",
          "docs": [
            "Required only when the lock has a payout curve (receives the excess)."
          ],
          "writable": true,
          "optional": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "refund_to"
              },
              {
                "kind": "account",
                "path": "token_program"
              },
              {
                "kind": "account",
                "path": "token_mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "payout_curve_program",
          "optional": true
        },
        {
          "name": "token_program"
        },
        {
          "name": "associated_token_program",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "hashlock",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "secret",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "refund_solver_sol",
      "discriminator": [
        50,
        141,
        169,
        25,
        246,
        101,
        74,
        6
      ],
      "accounts": [
        {
          "name": "caller",
          "signer": true
        },
        {
          "name": "solver_lock",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  108,
                  118,
                  101,
                  114,
                  95,
                  108,
                  111,
                  99,
                  107
                ]
              },
              {
                "kind": "arg",
                "path": "hashlock"
              },
              {
                "kind": "arg",
                "path": "solver"
              }
            ]
          }
        },
        {
          "name": "refund_to",
          "writable": true
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "hashlock",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "solver",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "refund_solver_sol_token_reward",
      "discriminator": [
        224,
        31,
        120,
        79,
        120,
        165,
        0,
        18
      ],
      "accounts": [
        {
          "name": "caller",
          "writable": true,
          "signer": true
        },
        {
          "name": "solver_lock",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  108,
                  118,
                  101,
                  114,
                  95,
                  108,
                  111,
                  99,
                  107
                ]
              },
              {
                "kind": "arg",
                "path": "hashlock"
              },
              {
                "kind": "arg",
                "path": "solver"
              }
            ]
          }
        },
        {
          "name": "rent_payer",
          "writable": true
        },
        {
          "name": "refund_to",
          "writable": true
        },
        {
          "name": "reward_token_mint"
        },
        {
          "name": "reward_vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  108,
                  118,
                  101,
                  114,
                  95,
                  114,
                  101,
                  119,
                  97,
                  114,
                  100,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "hashlock"
              },
              {
                "kind": "arg",
                "path": "solver"
              }
            ]
          }
        },
        {
          "name": "refund_to_reward_token_account",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "refund_to"
              },
              {
                "kind": "account",
                "path": "token_program"
              },
              {
                "kind": "account",
                "path": "reward_token_mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "token_program"
        },
        {
          "name": "associated_token_program",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "hashlock",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "solver",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "refund_solver_token",
      "discriminator": [
        60,
        218,
        158,
        221,
        178,
        70,
        15,
        135
      ],
      "accounts": [
        {
          "name": "caller",
          "writable": true,
          "signer": true
        },
        {
          "name": "solver_lock",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  108,
                  118,
                  101,
                  114,
                  95,
                  108,
                  111,
                  99,
                  107
                ]
              },
              {
                "kind": "arg",
                "path": "hashlock"
              },
              {
                "kind": "arg",
                "path": "solver"
              }
            ]
          }
        },
        {
          "name": "rent_payer",
          "docs": [
            "solver_lock.rent_payer"
          ],
          "writable": true
        },
        {
          "name": "refund_to"
        },
        {
          "name": "token_mint"
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  108,
                  118,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "hashlock"
              },
              {
                "kind": "arg",
                "path": "solver"
              }
            ]
          }
        },
        {
          "name": "refund_to_token_account",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "refund_to"
              },
              {
                "kind": "account",
                "path": "token_program"
              },
              {
                "kind": "account",
                "path": "token_mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "token_program"
        },
        {
          "name": "associated_token_program",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "hashlock",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "solver",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "refund_solver_token_diff_reward",
      "discriminator": [
        115,
        154,
        45,
        30,
        60,
        240,
        141,
        122
      ],
      "accounts": [
        {
          "name": "caller",
          "writable": true,
          "signer": true
        },
        {
          "name": "solver_lock",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  108,
                  118,
                  101,
                  114,
                  95,
                  108,
                  111,
                  99,
                  107
                ]
              },
              {
                "kind": "arg",
                "path": "hashlock"
              },
              {
                "kind": "arg",
                "path": "solver"
              }
            ]
          }
        },
        {
          "name": "rent_payer",
          "docs": [
            "solver_lock.rent_payer"
          ],
          "writable": true
        },
        {
          "name": "refund_to"
        },
        {
          "name": "token_mint"
        },
        {
          "name": "reward_token_mint"
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  108,
                  118,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "hashlock"
              },
              {
                "kind": "arg",
                "path": "solver"
              }
            ]
          }
        },
        {
          "name": "reward_vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  108,
                  118,
                  101,
                  114,
                  95,
                  114,
                  101,
                  119,
                  97,
                  114,
                  100,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "hashlock"
              },
              {
                "kind": "arg",
                "path": "solver"
              }
            ]
          }
        },
        {
          "name": "refund_to_token_account",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "refund_to"
              },
              {
                "kind": "account",
                "path": "token_program"
              },
              {
                "kind": "account",
                "path": "token_mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "refund_to_reward_token_account",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "refund_to"
              },
              {
                "kind": "account",
                "path": "token_program"
              },
              {
                "kind": "account",
                "path": "reward_token_mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "token_program"
        },
        {
          "name": "associated_token_program",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "hashlock",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "solver",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "refund_solver_token_sol_reward",
      "discriminator": [
        29,
        211,
        115,
        90,
        139,
        58,
        49,
        46
      ],
      "accounts": [
        {
          "name": "caller",
          "writable": true,
          "signer": true
        },
        {
          "name": "solver_lock",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  108,
                  118,
                  101,
                  114,
                  95,
                  108,
                  111,
                  99,
                  107
                ]
              },
              {
                "kind": "arg",
                "path": "hashlock"
              },
              {
                "kind": "arg",
                "path": "solver"
              }
            ]
          }
        },
        {
          "name": "rent_payer",
          "writable": true
        },
        {
          "name": "refund_to",
          "writable": true
        },
        {
          "name": "token_mint"
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  108,
                  118,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "hashlock"
              },
              {
                "kind": "arg",
                "path": "solver"
              }
            ]
          }
        },
        {
          "name": "refund_to_token_account",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "refund_to"
              },
              {
                "kind": "account",
                "path": "token_program"
              },
              {
                "kind": "account",
                "path": "token_mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "token_program"
        },
        {
          "name": "associated_token_program",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "hashlock",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "solver",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "refund_user_sol",
      "discriminator": [
        30,
        19,
        18,
        219,
        217,
        139,
        0,
        228
      ],
      "accounts": [
        {
          "name": "caller",
          "signer": true
        },
        {
          "name": "user_lock",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  108,
                  111,
                  99,
                  107
                ]
              },
              {
                "kind": "arg",
                "path": "hashlock"
              }
            ]
          }
        },
        {
          "name": "rent_payer",
          "writable": true
        },
        {
          "name": "refund_to",
          "writable": true
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "hashlock",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "refund_user_token",
      "discriminator": [
        86,
        78,
        244,
        214,
        30,
        222,
        125,
        195
      ],
      "accounts": [
        {
          "name": "caller",
          "writable": true,
          "signer": true
        },
        {
          "name": "user_lock",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  108,
                  111,
                  99,
                  107
                ]
              },
              {
                "kind": "arg",
                "path": "hashlock"
              }
            ]
          }
        },
        {
          "name": "rent_payer",
          "writable": true
        },
        {
          "name": "refund_to"
        },
        {
          "name": "token_mint"
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "hashlock"
              }
            ]
          }
        },
        {
          "name": "refund_to_token_account",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "refund_to"
              },
              {
                "kind": "account",
                "path": "token_program"
              },
              {
                "kind": "account",
                "path": "token_mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "token_program"
        },
        {
          "name": "associated_token_program",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "hashlock",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "solver_lock_sol",
      "discriminator": [
        35,
        247,
        168,
        201,
        87,
        39,
        138,
        122
      ],
      "accounts": [
        {
          "name": "payer",
          "docs": [
            "Pays rent and fees; may differ from `sender` in sponsored flows."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "sender",
          "docs": [
            "Funds authority: the SOL leaves this signer."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "guard",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  108,
                  118,
                  101,
                  114,
                  95,
                  103,
                  117,
                  97,
                  114,
                  100
                ]
              },
              {
                "kind": "arg",
                "path": "params.hashlock"
              },
              {
                "kind": "account",
                "path": "sender"
              }
            ]
          }
        },
        {
          "name": "solver_lock",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  108,
                  118,
                  101,
                  114,
                  95,
                  108,
                  111,
                  99,
                  107
                ]
              },
              {
                "kind": "arg",
                "path": "params.hashlock"
              },
              {
                "kind": "account",
                "path": "sender"
              }
            ]
          }
        },
        {
          "name": "payout_curve_program",
          "optional": true
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "SolverLockParams"
            }
          }
        },
        {
          "name": "data",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "solver_lock_sol_token_reward",
      "discriminator": [
        102,
        191,
        10,
        157,
        221,
        211,
        41,
        50
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "sender",
          "docs": [
            "Funds both the native principal and the SPL reward."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "guard",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  108,
                  118,
                  101,
                  114,
                  95,
                  103,
                  117,
                  97,
                  114,
                  100
                ]
              },
              {
                "kind": "arg",
                "path": "params.hashlock"
              },
              {
                "kind": "account",
                "path": "sender"
              }
            ]
          }
        },
        {
          "name": "solver_lock",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  108,
                  118,
                  101,
                  114,
                  95,
                  108,
                  111,
                  99,
                  107
                ]
              },
              {
                "kind": "arg",
                "path": "params.hashlock"
              },
              {
                "kind": "account",
                "path": "sender"
              }
            ]
          }
        },
        {
          "name": "reward_token_mint"
        },
        {
          "name": "sender_reward_token_account",
          "writable": true
        },
        {
          "name": "reward_vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  108,
                  118,
                  101,
                  114,
                  95,
                  114,
                  101,
                  119,
                  97,
                  114,
                  100,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "params.hashlock"
              },
              {
                "kind": "account",
                "path": "sender"
              }
            ]
          }
        },
        {
          "name": "payout_curve_program",
          "optional": true
        },
        {
          "name": "token_program"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "SolverLockParams"
            }
          }
        },
        {
          "name": "data",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "solver_lock_token",
      "discriminator": [
        95,
        75,
        155,
        114,
        253,
        146,
        126,
        66
      ],
      "accounts": [
        {
          "name": "payer",
          "docs": [
            "Pays rent and fees; may differ from `sender` in sponsored flows."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "sender",
          "docs": [
            "Funds authority: tokens leave this signer's token account."
          ],
          "signer": true
        },
        {
          "name": "guard",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  108,
                  118,
                  101,
                  114,
                  95,
                  103,
                  117,
                  97,
                  114,
                  100
                ]
              },
              {
                "kind": "arg",
                "path": "params.hashlock"
              },
              {
                "kind": "account",
                "path": "sender"
              }
            ]
          }
        },
        {
          "name": "solver_lock",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  108,
                  118,
                  101,
                  114,
                  95,
                  108,
                  111,
                  99,
                  107
                ]
              },
              {
                "kind": "arg",
                "path": "params.hashlock"
              },
              {
                "kind": "account",
                "path": "sender"
              }
            ]
          }
        },
        {
          "name": "token_mint"
        },
        {
          "name": "sender_token_account",
          "writable": true
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  108,
                  118,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "params.hashlock"
              },
              {
                "kind": "account",
                "path": "sender"
              }
            ]
          }
        },
        {
          "name": "payout_curve_program",
          "optional": true
        },
        {
          "name": "token_program"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "SolverLockParams"
            }
          }
        },
        {
          "name": "data",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "solver_lock_token_diff_reward",
      "discriminator": [
        58,
        7,
        9,
        111,
        250,
        37,
        106,
        29
      ],
      "accounts": [
        {
          "name": "payer",
          "docs": [
            "Pays rent and fees; may differ from `sender` in sponsored flows."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "sender",
          "docs": [
            "Funds authority: tokens leave this signer's token accounts."
          ],
          "signer": true
        },
        {
          "name": "guard",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  108,
                  118,
                  101,
                  114,
                  95,
                  103,
                  117,
                  97,
                  114,
                  100
                ]
              },
              {
                "kind": "arg",
                "path": "params.hashlock"
              },
              {
                "kind": "account",
                "path": "sender"
              }
            ]
          }
        },
        {
          "name": "solver_lock",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  108,
                  118,
                  101,
                  114,
                  95,
                  108,
                  111,
                  99,
                  107
                ]
              },
              {
                "kind": "arg",
                "path": "params.hashlock"
              },
              {
                "kind": "account",
                "path": "sender"
              }
            ]
          }
        },
        {
          "name": "token_mint"
        },
        {
          "name": "reward_token_mint"
        },
        {
          "name": "sender_token_account",
          "writable": true
        },
        {
          "name": "sender_reward_token_account",
          "writable": true
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  108,
                  118,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "params.hashlock"
              },
              {
                "kind": "account",
                "path": "sender"
              }
            ]
          }
        },
        {
          "name": "reward_vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  108,
                  118,
                  101,
                  114,
                  95,
                  114,
                  101,
                  119,
                  97,
                  114,
                  100,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "params.hashlock"
              },
              {
                "kind": "account",
                "path": "sender"
              }
            ]
          }
        },
        {
          "name": "payout_curve_program",
          "optional": true
        },
        {
          "name": "token_program"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "SolverLockParams"
            }
          }
        },
        {
          "name": "data",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "solver_lock_token_sol_reward",
      "discriminator": [
        229,
        63,
        38,
        181,
        110,
        146,
        22,
        221
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "sender",
          "docs": [
            "Funds both the SPL principal and native reward."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "guard",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  108,
                  118,
                  101,
                  114,
                  95,
                  103,
                  117,
                  97,
                  114,
                  100
                ]
              },
              {
                "kind": "arg",
                "path": "params.hashlock"
              },
              {
                "kind": "account",
                "path": "sender"
              }
            ]
          }
        },
        {
          "name": "solver_lock",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  108,
                  118,
                  101,
                  114,
                  95,
                  108,
                  111,
                  99,
                  107
                ]
              },
              {
                "kind": "arg",
                "path": "params.hashlock"
              },
              {
                "kind": "account",
                "path": "sender"
              }
            ]
          }
        },
        {
          "name": "token_mint"
        },
        {
          "name": "sender_token_account",
          "writable": true
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  115,
                  111,
                  108,
                  118,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "params.hashlock"
              },
              {
                "kind": "account",
                "path": "sender"
              }
            ]
          }
        },
        {
          "name": "payout_curve_program",
          "optional": true
        },
        {
          "name": "token_program"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "SolverLockParams"
            }
          }
        },
        {
          "name": "data",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "user_lock_sol",
      "discriminator": [
        214,
        198,
        105,
        134,
        57,
        232,
        113,
        180
      ],
      "accounts": [
        {
          "name": "payer",
          "docs": [
            "Pays rent and fees; may differ from `sender` in sponsored flows."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "sender",
          "docs": [
            "Funds authority: the SOL leaves this signer."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "user_lock",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  108,
                  111,
                  99,
                  107
                ]
              },
              {
                "kind": "arg",
                "path": "params.hashlock"
              }
            ]
          }
        },
        {
          "name": "payout_curve_program",
          "docs": [
            "params.payout_curve (key match + executable + probe CPI)."
          ],
          "optional": true
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "UserLockParams"
            }
          }
        },
        {
          "name": "user_data",
          "type": "bytes"
        },
        {
          "name": "solver_data",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "user_lock_token",
      "discriminator": [
        239,
        183,
        70,
        101,
        167,
        166,
        171,
        238
      ],
      "accounts": [
        {
          "name": "payer",
          "docs": [
            "Pays rent and fees; may differ from `sender` in sponsored flows."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "sender",
          "docs": [
            "Funds authority: tokens leave this signer's token account."
          ],
          "signer": true
        },
        {
          "name": "user_lock",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  108,
                  111,
                  99,
                  107
                ]
              },
              {
                "kind": "arg",
                "path": "params.hashlock"
              }
            ]
          }
        },
        {
          "name": "token_mint"
        },
        {
          "name": "sender_token_account",
          "writable": true
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "params.hashlock"
              }
            ]
          }
        },
        {
          "name": "payout_curve_program",
          "docs": [
            "params.payout_curve (key match + executable + probe CPI)."
          ],
          "optional": true
        },
        {
          "name": "token_program"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "UserLockParams"
            }
          }
        },
        {
          "name": "user_data",
          "type": "bytes"
        },
        {
          "name": "solver_data",
          "type": "bytes"
        }
      ]
    },
    {
      "name": "user_lock_token_with_intent",
      "discriminator": [
        110,
        101,
        71,
        86,
        64,
        241,
        91,
        29
      ],
      "accounts": [
        {
          "name": "payer",
          "docs": [
            "The relayer: pays rent and fees, receives them back when accounts close."
          ],
          "writable": true,
          "signer": true
        },
        {
          "name": "user",
          "docs": [
            "by the ed25519 instruction verified in the handler, and funds move only from",
            "a token account this key owns, only under its signed intent."
          ]
        },
        {
          "name": "intent_domain",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  116,
                  101,
                  110,
                  116,
                  95,
                  100,
                  111,
                  109,
                  97,
                  105,
                  110
                ]
              }
            ]
          }
        },
        {
          "name": "consumed_intent",
          "docs": [
            "Single-use replay guard keyed by (user, nonce): `init` fails if this nonce was",
            "already used, so a signed intent can be executed at most once."
          ],
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  110,
                  116,
                  101,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "arg",
                "path": "nonce"
              }
            ]
          }
        },
        {
          "name": "delegate",
          "docs": [
            "authorize the token pull. Never holds funds."
          ],
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "user_lock",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  108,
                  111,
                  99,
                  107
                ]
              },
              {
                "kind": "arg",
                "path": "params.hashlock"
              }
            ]
          }
        },
        {
          "name": "token_mint"
        },
        {
          "name": "user_token_account",
          "writable": true
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "params.hashlock"
              }
            ]
          }
        },
        {
          "name": "payout_curve_program",
          "optional": true
        },
        {
          "name": "instructions_sysvar",
          "docs": [
            "handler goes through the checked sysvar API (no sysvar spoofing)."
          ],
          "address": "Sysvar1nstructions1111111111111111111111111"
        },
        {
          "name": "token_program"
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "params",
          "type": {
            "defined": {
              "name": "UserLockParams"
            }
          }
        },
        {
          "name": "user_data",
          "type": "bytes"
        },
        {
          "name": "solver_data",
          "type": "bytes"
        },
        {
          "name": "nonce",
          "type": "u64"
        },
        {
          "name": "deadline",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "ConsumedIntent",
      "discriminator": [
        175,
        69,
        99,
        123,
        48,
        7,
        235,
        115
      ]
    },
    {
      "name": "IntentDomain",
      "discriminator": [
        58,
        165,
        30,
        11,
        106,
        28,
        38,
        62
      ]
    },
    {
      "name": "SolverLock",
      "discriminator": [
        243,
        127,
        29,
        186,
        176,
        44,
        12,
        85
      ]
    },
    {
      "name": "SolverLockGuard",
      "discriminator": [
        180,
        194,
        202,
        101,
        9,
        113,
        138,
        173
      ]
    },
    {
      "name": "UserLock",
      "discriminator": [
        107,
        42,
        69,
        173,
        232,
        188,
        205,
        98
      ]
    }
  ],
  "events": [
    {
      "name": "IntentConsumed",
      "discriminator": [
        142,
        216,
        106,
        77,
        223,
        216,
        165,
        48
      ]
    },
    {
      "name": "SolverLocked",
      "discriminator": [
        124,
        169,
        104,
        162,
        255,
        178,
        136,
        197
      ]
    },
    {
      "name": "SolverRedeemed",
      "discriminator": [
        175,
        134,
        83,
        184,
        150,
        62,
        172,
        196
      ]
    },
    {
      "name": "SolverRefunded",
      "discriminator": [
        78,
        144,
        230,
        203,
        161,
        247,
        151,
        37
      ]
    },
    {
      "name": "UserLocked",
      "discriminator": [
        113,
        246,
        107,
        252,
        122,
        82,
        241,
        159
      ]
    },
    {
      "name": "UserRedeemed",
      "discriminator": [
        158,
        165,
        185,
        4,
        94,
        204,
        37,
        237
      ]
    },
    {
      "name": "UserRefunded",
      "discriminator": [
        217,
        44,
        189,
        196,
        215,
        248,
        130,
        200
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "ZeroAmount",
      "msg": "Amount must be greater than zero."
    },
    {
      "code": 6001,
      "name": "ZeroTimelockDelta",
      "msg": "Timelock delta must be greater than zero."
    },
    {
      "code": 6002,
      "name": "QuoteExpired",
      "msg": "Quote has expired."
    },
    {
      "code": 6003,
      "name": "NotPending",
      "msg": "Lock is not in Pending status."
    },
    {
      "code": 6004,
      "name": "TimelockNotExpired",
      "msg": "Timelock has not expired yet."
    },
    {
      "code": 6005,
      "name": "HashlockMismatch",
      "msg": "Secret does not match hashlock."
    },
    {
      "code": 6006,
      "name": "RewardTimelockNotLessThanTimelock",
      "msg": "Reward timelock delta must be less than timelock delta."
    },
    {
      "code": 6007,
      "name": "SolverLockAlreadyExists",
      "msg": "This solver already created a lock for this hashlock."
    },
    {
      "code": 6008,
      "name": "WrongToken",
      "msg": "Wrong token mint provided."
    },
    {
      "code": 6009,
      "name": "WrongSender",
      "msg": "Wrong sender address."
    },
    {
      "code": 6010,
      "name": "WrongRecipient",
      "msg": "Wrong recipient address."
    },
    {
      "code": 6011,
      "name": "StillPending",
      "msg": "Lock is still pending."
    },
    {
      "code": 6012,
      "name": "Overflow",
      "msg": "Arithmetic overflow."
    },
    {
      "code": 6013,
      "name": "ZeroAddress",
      "msg": "Recipient and refund_to must be non-default addresses."
    },
    {
      "code": 6014,
      "name": "WrongRefundTo",
      "msg": "Wrong refund_to address."
    },
    {
      "code": 6015,
      "name": "WrongRentPayer",
      "msg": "Wrong rent payer address."
    },
    {
      "code": 6016,
      "name": "InvalidPayoutCurve",
      "msg": "Payout curve account missing, mismatched, or not executable."
    },
    {
      "code": 6017,
      "name": "InvalidPayout",
      "msg": "Payout curve returned an invalid payout (must satisfy 0 < payout <= amount)."
    },
    {
      "code": 6018,
      "name": "CurveDataTooLarge",
      "msg": "Payout curve config data exceeds the maximum length."
    },
    {
      "code": 6019,
      "name": "UnsupportedMintExtension",
      "msg": "Mint has an unsupported Token-2022 extension (permanent delegate or transfer hook)."
    },
    {
      "code": 6020,
      "name": "NothingReceived",
      "msg": "Escrow received zero tokens (transfer fee consumed the full amount?)."
    },
    {
      "code": 6021,
      "name": "IntentExpired",
      "msg": "Intent deadline has passed."
    },
    {
      "code": 6022,
      "name": "IntentNotExpired",
      "msg": "Intent deadline has not passed yet."
    },
    {
      "code": 6023,
      "name": "InvalidIntentSignature",
      "msg": "Missing or invalid ed25519 signature verification instruction for the intent."
    },
    {
      "code": 6024,
      "name": "InvalidDelegation",
      "msg": "Token account is not delegated to the program delegate for the required amount."
    },
    {
      "code": 6025,
      "name": "Unauthorized",
      "msg": "Only the program upgrade authority may perform this action."
    }
  ],
  "types": [
    {
      "name": "ConsumedIntent",
      "docs": [
        "Single-use replay guard for the gasless intent path. Keyed by PDA seeds",
        "[\"intent\", user, nonce_le] (the nonce is bound into the user's signed message, so",
        "a given (user, nonce) authorizes exactly one lock); `init` makes a second",
        "consumption impossible while the account exists, and the deadline check makes it",
        "impossible after the account is closed for rent recovery."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "intent_hash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "deadline",
            "type": "u64"
          },
          {
            "name": "rent_payer",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "IntentConsumed",
      "docs": [
        "Emitted when a signed gasless intent is executed by a relayer."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "intent_hash",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "relayer",
            "type": "pubkey"
          },
          {
            "name": "token_mint",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "nonce",
            "type": "u64"
          },
          {
            "name": "deadline",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "IntentDomain",
      "docs": [
        "Per-deployment domain separator for signed intents. The salt is mixed into every",
        "signed intent message to give cross-cluster replay protection (a value a Solana",
        "program cannot derive on-chain), so it must differ across clusters. Initialized",
        "once by the program upgrade authority."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "salt",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "SolverLock",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "secret",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "amount",
            "docs": [
              "Measured principal received (fee-on-transfer safe)."
            ],
            "type": "u64"
          },
          {
            "name": "reward",
            "docs": [
              "Measured reward received. Never decayed by the payout curve."
            ],
            "type": "u64"
          },
          {
            "name": "sender",
            "type": "pubkey"
          },
          {
            "name": "timelock",
            "type": "u64"
          },
          {
            "name": "reward_timelock",
            "docs": [
              "Computed forward from lock creation: start_time + reward_timelock_delta.",
              "Before it, redeem routes the reward to reward_recipient; at/after it, to the",
              "redeem caller (relayer bounty)."
            ],
            "type": "u64"
          },
          {
            "name": "start_time",
            "type": "u64"
          },
          {
            "name": "recipient",
            "type": "pubkey"
          },
          {
            "name": "status",
            "type": "u8"
          },
          {
            "name": "reward_recipient",
            "type": "pubkey"
          },
          {
            "name": "refund_to",
            "type": "pubkey"
          },
          {
            "name": "token_mint",
            "type": "pubkey"
          },
          {
            "name": "reward_token_mint",
            "type": "pubkey"
          },
          {
            "name": "rent_payer",
            "type": "pubkey"
          },
          {
            "name": "payout_curve",
            "type": "pubkey"
          },
          {
            "name": "payout_curve_data",
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "SolverLockData",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "secret",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "reward",
            "type": "u64"
          },
          {
            "name": "sender",
            "type": "pubkey"
          },
          {
            "name": "timelock",
            "type": "u64"
          },
          {
            "name": "reward_timelock",
            "type": "u64"
          },
          {
            "name": "start_time",
            "type": "u64"
          },
          {
            "name": "recipient",
            "type": "pubkey"
          },
          {
            "name": "status",
            "type": "u8"
          },
          {
            "name": "reward_recipient",
            "type": "pubkey"
          },
          {
            "name": "refund_to",
            "type": "pubkey"
          },
          {
            "name": "token_mint",
            "type": "pubkey"
          },
          {
            "name": "reward_token_mint",
            "type": "pubkey"
          },
          {
            "name": "rent_payer",
            "type": "pubkey"
          },
          {
            "name": "payout_curve",
            "type": "pubkey"
          },
          {
            "name": "payout_curve_data",
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "SolverLockGuard",
      "docs": [
        "Permanent single-use marker for a `(hashlock, solver)` pair. The full solver lock",
        "may be closed after settlement to recover rent, but this compact guard is never",
        "closed, so a blind retry can never escrow funds twice."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "used",
            "type": "bool"
          },
          {
            "name": "solver",
            "type": "pubkey"
          },
          {
            "name": "hashlock",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "SolverLockParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "hashlock",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "reward",
            "type": "u64"
          },
          {
            "name": "timelock_delta",
            "type": "u64"
          },
          {
            "name": "reward_timelock_delta",
            "type": "u64"
          },
          {
            "name": "recipient",
            "type": "pubkey"
          },
          {
            "name": "reward_recipient",
            "type": "pubkey"
          },
          {
            "name": "refund_to",
            "type": "pubkey"
          },
          {
            "name": "payout_curve",
            "docs": [
              "Pubkey::default() == no curve."
            ],
            "type": "pubkey"
          },
          {
            "name": "payout_curve_data",
            "type": "bytes"
          },
          {
            "name": "src_chain",
            "type": "string"
          },
          {
            "name": "dst_chain",
            "type": "string"
          },
          {
            "name": "dst_address",
            "type": "string"
          },
          {
            "name": "dst_amount",
            "type": "u128"
          },
          {
            "name": "dst_token",
            "type": "string"
          }
        ]
      }
    },
    {
      "name": "SolverLocked",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "hashlock",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "sender",
            "type": "pubkey"
          },
          {
            "name": "recipient",
            "type": "pubkey"
          },
          {
            "name": "refund_to",
            "type": "pubkey"
          },
          {
            "name": "src_chain",
            "type": "string"
          },
          {
            "name": "token_mint",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "reward",
            "type": "u64"
          },
          {
            "name": "reward_token_mint",
            "type": "pubkey"
          },
          {
            "name": "reward_recipient",
            "type": "pubkey"
          },
          {
            "name": "timelock",
            "type": "u64"
          },
          {
            "name": "reward_timelock",
            "type": "u64"
          },
          {
            "name": "payout_curve",
            "type": "pubkey"
          },
          {
            "name": "dst_chain",
            "type": "string"
          },
          {
            "name": "dst_address",
            "type": "string"
          },
          {
            "name": "dst_amount",
            "type": "u128"
          },
          {
            "name": "dst_token",
            "type": "string"
          },
          {
            "name": "data",
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "SolverRedeemed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "hashlock",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "solver",
            "type": "pubkey"
          },
          {
            "name": "redeemer",
            "type": "pubkey"
          },
          {
            "name": "secret",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "payout",
            "type": "u64"
          },
          {
            "name": "excess",
            "type": "u64"
          },
          {
            "name": "reward_to",
            "type": "pubkey"
          },
          {
            "name": "reward",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "SolverRefunded",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "hashlock",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "solver",
            "type": "pubkey"
          },
          {
            "name": "refund_to",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "reward",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "UserLock",
      "docs": [
        "INVARIANT (status machine): Empty -> Pending -> {Refunded | Redeemed}; terminal",
        "states are final. Every settlement path requires status == Pending, so a lock",
        "settles exactly once while its account exists.",
        "",
        "Settled user locks are closed and their rent recovered, so a settled hashlock PDA",
        "can be re-initialized. Hashlock uniqueness is therefore a client convention, not",
        "chain-enforced; replay protection never depends on it (native transaction",
        "signature dedup for co-signed flows, the ConsumedIntent PDA for intent flows)."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "secret",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "amount",
            "docs": [
              "Measured amount actually received by the escrow (fee-on-transfer safe)."
            ],
            "type": "u64"
          },
          {
            "name": "sender",
            "docs": [
              "The funds authority: the `sender` signer, or the intent signer on the",
              "gasless intent path. Never taken from instruction args."
            ],
            "type": "pubkey"
          },
          {
            "name": "timelock",
            "type": "u64"
          },
          {
            "name": "start_time",
            "type": "u64"
          },
          {
            "name": "status",
            "type": "u8"
          },
          {
            "name": "recipient",
            "type": "pubkey"
          },
          {
            "name": "refund_to",
            "docs": [
              "Sink for refunds and redeem excess (amount - payout). Independent of sender."
            ],
            "type": "pubkey"
          },
          {
            "name": "token_mint",
            "docs": [
              "Pubkey::default() == native SOL"
            ],
            "type": "pubkey"
          },
          {
            "name": "rent_payer",
            "docs": [
              "Who paid rent for this lock (and its vault); rent returns here on close.",
              "In sponsored flows this is the relayer, not the sender."
            ],
            "type": "pubkey"
          },
          {
            "name": "payout_curve",
            "docs": [
              "Payout curve program id; Pubkey::default() == no curve (payout = amount)."
            ],
            "type": "pubkey"
          },
          {
            "name": "payout_curve_data",
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "UserLockData",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "secret",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "sender",
            "type": "pubkey"
          },
          {
            "name": "timelock",
            "type": "u64"
          },
          {
            "name": "start_time",
            "type": "u64"
          },
          {
            "name": "status",
            "type": "u8"
          },
          {
            "name": "recipient",
            "type": "pubkey"
          },
          {
            "name": "refund_to",
            "type": "pubkey"
          },
          {
            "name": "token_mint",
            "type": "pubkey"
          },
          {
            "name": "rent_payer",
            "type": "pubkey"
          },
          {
            "name": "payout_curve",
            "type": "pubkey"
          },
          {
            "name": "payout_curve_data",
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "UserLockParams",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "hashlock",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "timelock_delta",
            "type": "u64"
          },
          {
            "name": "quote_expiry",
            "type": "u64"
          },
          {
            "name": "recipient",
            "type": "pubkey"
          },
          {
            "name": "refund_to",
            "type": "pubkey"
          },
          {
            "name": "payout_curve",
            "docs": [
              "Pubkey::default() == no curve."
            ],
            "type": "pubkey"
          },
          {
            "name": "payout_curve_data",
            "type": "bytes"
          },
          {
            "name": "src_chain",
            "type": "string"
          },
          {
            "name": "dst_chain",
            "type": "string"
          },
          {
            "name": "dst_address",
            "type": "string"
          },
          {
            "name": "dst_amount",
            "type": "u128"
          },
          {
            "name": "dst_token",
            "type": "string"
          },
          {
            "name": "reward_amount",
            "type": "u128"
          },
          {
            "name": "reward_token",
            "type": "string"
          },
          {
            "name": "reward_recipient",
            "type": "string"
          },
          {
            "name": "reward_timelock_delta",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "UserLocked",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "hashlock",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "sender",
            "type": "pubkey"
          },
          {
            "name": "recipient",
            "type": "pubkey"
          },
          {
            "name": "refund_to",
            "type": "pubkey"
          },
          {
            "name": "src_chain",
            "type": "string"
          },
          {
            "name": "token_mint",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "timelock",
            "type": "u64"
          },
          {
            "name": "payout_curve",
            "type": "pubkey"
          },
          {
            "name": "dst_chain",
            "type": "string"
          },
          {
            "name": "dst_address",
            "type": "string"
          },
          {
            "name": "dst_amount",
            "type": "u128"
          },
          {
            "name": "dst_token",
            "type": "string"
          },
          {
            "name": "reward_amount",
            "type": "u128"
          },
          {
            "name": "reward_token",
            "type": "string"
          },
          {
            "name": "reward_recipient",
            "type": "string"
          },
          {
            "name": "reward_timelock_delta",
            "type": "u64"
          },
          {
            "name": "quote_expiry",
            "type": "u64"
          },
          {
            "name": "user_data",
            "type": "bytes"
          },
          {
            "name": "solver_data",
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "UserRedeemed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "hashlock",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "redeemer",
            "type": "pubkey"
          },
          {
            "name": "secret",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "payout",
            "type": "u64"
          },
          {
            "name": "excess",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "UserRefunded",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "hashlock",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "refund_to",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    }
  ]
}

/**
 * IDL generated from TrainProtocol/contracts@main-add-solana.
 *
 * The Station API supplies the deployed program address per network, so keep the
 * generated schema while allowing callers to override its devnet address.
 */
export const TrainHtlc = (address: string): Idl => ({
  ...TRAIN_HTLC_IDL,
  address,
})
