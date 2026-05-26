import type { Idl } from '@coral-xyz/anchor'

export const TrainHtlc = (address: string): Idl => ({
  "address": address,
  "metadata": {
    "name": "train_htlc",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Train HTLC program for cross-chain atomic swaps"
  },
  "instructions": [
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
                "path": "_index"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "_hashlock",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "_index",
          "type": "u64"
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
                "path": "_index"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "_hashlock",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "_index",
          "type": "u64"
        }
      ],
      "returns": {
        "defined": {
          "name": "SolverLockData"
        }
      }
    },
    {
      "name": "get_solver_lock_count",
      "discriminator": [
        88,
        88,
        167,
        23,
        36,
        78,
        199,
        154
      ],
      "accounts": [
        {
          "name": "counter",
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
                  99,
                  111,
                  117,
                  110,
                  116
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
          "name": "_hashlock",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ],
      "returns": "u64"
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
          "name": "_hashlock",
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
                "path": "index"
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
          "name": "index",
          "type": "u64"
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
                "path": "index"
              }
            ]
          }
        },
        {
          "name": "recipient"
        },
        {
          "name": "reward_recipient"
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
                "path": "index"
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
          "name": "sender",
          "writable": true
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
          "name": "index",
          "type": "u64"
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
                "path": "index"
              }
            ]
          }
        },
        {
          "name": "recipient"
        },
        {
          "name": "reward_recipient"
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
                "path": "index"
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
                "path": "index"
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
          "name": "sender",
          "writable": true
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
          "name": "index",
          "type": "u64"
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
          "name": "sender",
          "writable": true
        },
        {
          "name": "recipient",
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
          "name": "sender",
          "writable": true
        },
        {
          "name": "recipient"
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
                "path": "_index"
              }
            ]
          }
        },
        {
          "name": "sender",
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
          "name": "_index",
          "type": "u64"
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
                "path": "index"
              }
            ]
          }
        },
        {
          "name": "sender",
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
                "path": "index"
              }
            ]
          }
        },
        {
          "name": "sender_token_account",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "sender"
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
          "name": "index",
          "type": "u64"
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
                "path": "index"
              }
            ]
          }
        },
        {
          "name": "sender",
          "writable": true
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
                "path": "index"
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
                "path": "index"
              }
            ]
          }
        },
        {
          "name": "sender_token_account",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "sender"
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
          "name": "sender_reward_token_account",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "sender"
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
          "name": "index",
          "type": "u64"
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
          "name": "sender",
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
          "name": "sender",
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
          "name": "sender_token_account",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "sender"
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
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "counter",
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
                  99,
                  111,
                  117,
                  110,
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
                "path": "index"
              }
            ]
          }
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
          "name": "index",
          "type": "u64"
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
          "name": "sender",
          "type": "pubkey"
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
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "counter",
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
                  99,
                  111,
                  117,
                  110,
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
                "path": "index"
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
                "path": "hashlock"
              },
              {
                "kind": "arg",
                "path": "index"
              }
            ]
          }
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
          "name": "hashlock",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "index",
          "type": "u64"
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
          "name": "sender",
          "type": "pubkey"
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
          "name": "signer",
          "writable": true,
          "signer": true
        },
        {
          "name": "counter",
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
                  99,
                  111,
                  117,
                  110,
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
                "path": "index"
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
                "path": "hashlock"
              },
              {
                "kind": "arg",
                "path": "index"
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
                "path": "index"
              }
            ]
          }
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
          "name": "hashlock",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "index",
          "type": "u64"
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
          "name": "sender",
          "type": "pubkey"
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
          "name": "signer",
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
          "name": "sender",
          "type": "pubkey"
        },
        {
          "name": "recipient",
          "type": "pubkey"
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
          "name": "signer",
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
                "path": "hashlock"
              }
            ]
          }
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
          "name": "sender",
          "type": "pubkey"
        },
        {
          "name": "recipient",
          "type": "pubkey"
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
  ],
  "accounts": [
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
      "name": "SolverLockCounter",
      "discriminator": [
        192,
        165,
        115,
        87,
        4,
        102,
        174,
        95
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
      "name": "InvalidIndex",
      "msg": "Invalid index: must equal current count + 1."
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
    }
  ],
  "types": [
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
            "name": "token_mint",
            "type": "pubkey"
          },
          {
            "name": "reward_token_mint",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "SolverLockCounter",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "count",
            "type": "u64"
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
            "name": "token_mint",
            "type": "pubkey"
          },
          {
            "name": "reward_token_mint",
            "type": "pubkey"
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
            "name": "index",
            "type": "u64"
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
            "name": "index",
            "type": "u64"
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
            "name": "index",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "UserLock",
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
            "name": "status",
            "type": "u8"
          },
          {
            "name": "recipient",
            "type": "pubkey"
          },
          {
            "name": "token_mint",
            "type": "pubkey"
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
            "name": "status",
            "type": "u8"
          },
          {
            "name": "recipient",
            "type": "pubkey"
          },
          {
            "name": "token_mint",
            "type": "pubkey"
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
          }
        ]
      }
    }
  ]
})
