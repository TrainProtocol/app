import { Idl } from "@coral-xyz/anchor"

export const NativeAnchorHtlc = (address: string): Idl => ({
    "address": address,
    "metadata": {
      "name": "native_htlc",
      "version": "0.1.0",
      "spec": "0.1.0",
      "description": "Created with Anchor"
    },
    "docs": [
      "@title Pre Hashed Timelock Contracts (PHTLCs) on Solana.",
      "",
      "This contract provides a way to create and keep PHTLCs for Solana.",
      "",
      "Protocol:",
      "",
      "1) commit(src_receiver, timelock, amount) - a",
      "sender calls this to create a new HTLC",
      "for a given amount. A [u8; 32] Id is returned.",
      "2) lock(src_receiver, hashlock, timelock, amount) - a",
      "sender calls this to create a new HTLC",
      "for a given amount. A [u8; 32] Id is returned.",
      "3) addLock(Id, hashlock, timelock) - the sender calls this function",
      "to add the hashlock to HTLC.",
      "4) redeem(Id, secret) - once the src_receiver knows the secret of",
      "the hashlock hash they can claim the sol with this function",
      "5) refund(Id) - after timelock has expired and if the src_receiver did not",
      "redeem the sol the sender / creator of the HTLC can get their sol",
      "back with this function."
    ],
    "instructions": [
      {
        "name": "add_lock",
        "docs": [
          "@dev Called by the sender to add hashlock to the HTLC",
          "",
          "@param Id of the HTLC to addLock.",
          "@param hashlock of the HTLC to be locked."
        ],
        "discriminator": [
          242,
          102,
          183,
          107,
          109,
          168,
          82,
          140
        ],
        "accounts": [
          {
            "name": "sender",
            "signer": true
          },
          {
            "name": "payer",
            "writable": true,
            "signer": true
          },
          {
            "name": "htlc",
            "writable": true,
            "pda": {
              "seeds": [
                {
                  "kind": "arg",
                  "path": "Id"
                }
              ]
            }
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
            "name": "Id",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
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
            "name": "timelock",
            "type": "u64"
          }
        ],
        "returns": {
          "array": [
            "u8",
            32
          ]
        }
      },
      {
        "name": "commit",
        "docs": [
          "@dev Sender / Payer sets up a new pre-hash time lock contract depositing the",
          "funds and providing the src_receiver and terms.",
          "@param src_receiver src_receiver of the funds.",
          "@param timelock UNIX epoch seconds time that the lock expires at.",
          "Refunds can be made after this time.",
          "@return Id of the new HTLC. This is needed for subsequent calls."
        ],
        "discriminator": [
          223,
          140,
          142,
          165,
          229,
          208,
          156,
          74
        ],
        "accounts": [
          {
            "name": "sender",
            "writable": true,
            "signer": true
          },
          {
            "name": "htlc",
            "writable": true,
            "pda": {
              "seeds": [
                {
                  "kind": "arg",
                  "path": "Id"
                }
              ]
            }
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
            "name": "Id",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
          {
            "name": "hopChains",
            "type": {
              "vec": "string"
            }
          },
          {
            "name": "hopAssets",
            "type": {
              "vec": "string"
            }
          },
          {
            "name": "hopAddresses",
            "type": {
              "vec": "string"
            }
          },
          {
            "name": "dst_chain",
            "type": "string"
          },
          {
            "name": "dst_asset",
            "type": "string"
          },
          {
            "name": "dst_address",
            "type": "string"
          },
          {
            "name": "src_asset",
            "type": "string"
          },
          {
            "name": "src_receiver",
            "type": "pubkey"
          },
          {
            "name": "timelock",
            "type": "u64"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "commit_bump",
            "type": "u8"
          }
        ],
        "returns": {
          "array": [
            "u8",
            32
          ]
        }
      },
      {
        "name": "getDetails",
        "docs": [
          "@dev Get HTLC details.",
          "@param Id of the HTLC."
        ],
        "discriminator": [
          185,
          254,
          236,
          165,
          213,
          30,
          224,
          250
        ],
        "accounts": [
          {
            "name": "htlc",
            "pda": {
              "seeds": [
                {
                  "kind": "arg",
                  "path": "Id"
                }
              ]
            }
          }
        ],
        "args": [
          {
            "name": "Id",
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
            "name": "HTLC"
          }
        }
      },
      {
        "name": "get_commit_id",
        "docs": [
          "@dev Called by the Sender to get the commitId from the given parameters."
        ],
        "discriminator": [
          9,
          198,
          196,
          84,
          37,
          226,
          163,
          166
        ],
        "accounts": [
          {
            "name": "sender"
          },
          {
            "name": "receiver"
          }
        ],
        "args": [
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "timelock",
            "type": "u64"
          }
        ],
        "returns": {
          "array": [
            "u8",
            32
          ]
        }
      },
      {
        "name": "lock",
        "docs": [
          "@dev Sender / Payer sets up a new hash time lock contract depositing the",
          "funds and providing the reciever and terms.",
          "@param src_receiver receiver of the funds.",
          "@param hashlock A sha-256 hash hashlock.",
          "@param timelock UNIX epoch seconds time that the lock expires at.",
          "Refunds can be made after this time.",
          "@return Id of the new HTLC. This is needed for subsequent calls."
        ],
        "discriminator": [
          21,
          19,
          208,
          43,
          237,
          62,
          255,
          87
        ],
        "accounts": [
          {
            "name": "sender",
            "writable": true,
            "signer": true
          },
          {
            "name": "htlc",
            "writable": true,
            "pda": {
              "seeds": [
                {
                  "kind": "arg",
                  "path": "Id"
                }
              ]
            }
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
            "name": "Id",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          },
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
            "name": "timelock",
            "type": "u64"
          },
          {
            "name": "amount",
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
            "name": "dst_asset",
            "type": "string"
          },
          {
            "name": "src_asset",
            "type": "string"
          },
          {
            "name": "src_receiver",
            "type": "pubkey"
          },
          {
            "name": "lock_bump",
            "type": "u8"
          }
        ],
        "returns": {
          "array": [
            "u8",
            32
          ]
        }
      },
      {
        "name": "redeem",
        "docs": [
          "@dev Called by the src_receiver once they know the secret of the hashlock.",
          "This will transfer the locked funds to the HTLC's src_receiver's address.",
          "",
          "@param Id of the HTLC.",
          "@param secret sha256(secret) should equal the contract hashlock."
        ],
        "discriminator": [
          184,
          12,
          86,
          149,
          70,
          196,
          97,
          225
        ],
        "accounts": [
          {
            "name": "user_signing",
            "writable": true,
            "signer": true
          },
          {
            "name": "htlc",
            "writable": true,
            "pda": {
              "seeds": [
                {
                  "kind": "arg",
                  "path": "Id"
                }
              ]
            }
          },
          {
            "name": "src_receiver",
            "writable": true,
            "relations": [
              "htlc"
            ]
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
            "name": "Id",
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
        ],
        "returns": "bool"
      },
      {
        "name": "refund",
        "docs": [
          "@dev Called by the sender if there was no redeem AND the time lock has",
          "expired. This will refund the contract amount.",
          "",
          "@param Id of the HTLC to refund from."
        ],
        "discriminator": [
          2,
          96,
          183,
          251,
          63,
          208,
          46,
          46
        ],
        "accounts": [
          {
            "name": "user_signing",
            "writable": true,
            "signer": true
          },
          {
            "name": "htlc",
            "writable": true,
            "pda": {
              "seeds": [
                {
                  "kind": "arg",
                  "path": "Id"
                }
              ]
            }
          },
          {
            "name": "sender",
            "writable": true,
            "relations": [
              "htlc"
            ]
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
            "name": "Id",
            "type": {
              "array": [
                "u8",
                32
              ]
            }
          }
        ],
        "returns": "bool"
      }
    ],
    "accounts": [
      {
        "name": "HTLC",
        "discriminator": [
          172,
          245,
          108,
          24,
          224,
          199,
          55,
          177
        ]
      }
    ],
    "errors": [
      {
        "code": 6000,
        "name": "NotFutureTimeLock",
        "msg": "Not Future TimeLock."
      },
      {
        "code": 6001,
        "name": "NotPastTimeLock",
        "msg": "Not Past TimeLock."
      },
      {
        "code": 6002,
        "name": "HashlockNotSet",
        "msg": "Hashlock Is Not Set."
      },
      {
        "code": 6003,
        "name": "HashlockNoMatch",
        "msg": "Does Not Match the Hashlock."
      },
      {
        "code": 6004,
        "name": "HashlockAlreadySet",
        "msg": "Hashlock Already Set."
      },
      {
        "code": 6005,
        "name": "AlreadyRedeemed",
        "msg": "Funds Are Alredy Redeemed."
      },
      {
        "code": 6006,
        "name": "AlreadyRefunded",
        "msg": "Funds Are Alredy Refunded."
      },
      {
        "code": 6007,
        "name": "FundsNotSent",
        "msg": "Funds Can Not Be Zero."
      },
      {
        "code": 6008,
        "name": "UnauthorizedAccess",
        "msg": "Unauthorized Access."
      },
      {
        "code": 6009,
        "name": "NotOwner",
        "msg": "Not The Owner."
      },
      {
        "code": 6010,
        "name": "NotSender",
        "msg": "Not The Sender."
      },
      {
        "code": 6011,
        "name": "NotReciever",
        "msg": "Not The Reciever."
      }
    ],
    "types": [
      {
        "name": "HTLC",
        "type": {
          "kind": "struct",
          "fields": [
            {
              "name": "dst_address",
              "type": "string"
            },
            {
              "name": "dst_chain",
              "type": "string"
            },
            {
              "name": "dst_asset",
              "type": "string"
            },
            {
              "name": "src_asset",
              "type": "string"
            },
            {
              "name": "sender",
              "type": "pubkey"
            },
            {
              "name": "src_receiver",
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
              "name": "amount",
              "type": "u64"
            },
            {
              "name": "timelock",
              "type": "u64"
            },
            {
              "name": "redeemed",
              "type": "bool"
            },
            {
              "name": "refunded",
              "type": "bool"
            }
          ]
        }
      }
    ]
  })