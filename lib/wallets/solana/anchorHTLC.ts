import { Idl } from "@coral-xyz/anchor"

export const AnchorHtlc = (address: string): Idl => ({
  "address": address,
  "metadata": {
    "name": "anchorHtlc",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "addLock",
      "docs": [
        "@dev Called by the sender to add hashlock to the HTLC",
        "",
        "@param Id of the HTLC.",
        "@param hashlock to be added."
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
                "path": "id"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "id",
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
        "funds and providing the reciever/src_receiver and terms.",
        "@param src_receiver reciever of the funds.",
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
                "path": "id"
              }
            ]
          }
        },
        {
          "name": "htlcTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  104,
                  116,
                  108,
                  99,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "id"
              }
            ]
          }
        },
        {
          "name": "tokenContract"
        },
        {
          "name": "senderTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "id",
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
          "name": "hopAddress",
          "type": {
            "vec": "string"
          }
        },
        {
          "name": "dstChain",
          "type": "string"
        },
        {
          "name": "dstAsset",
          "type": "string"
        },
        {
          "name": "dstAddress",
          "type": "string"
        },
        {
          "name": "srcAsset",
          "type": "string"
        },
        {
          "name": "srcReceiver",
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
          "name": "commitBump",
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
                "path": "id"
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "id",
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
          "name": "htlc"
        }
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
                "path": "id"
              }
            ]
          }
        },
        {
          "name": "htlcTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  104,
                  116,
                  108,
                  99,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "id"
              }
            ]
          }
        },
        {
          "name": "tokenContract"
        },
        {
          "name": "senderTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "id",
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
          "name": "dstChain",
          "type": "string"
        },
        {
          "name": "dstAddress",
          "type": "string"
        },
        {
          "name": "dstAsset",
          "type": "string"
        },
        {
          "name": "srcAsset",
          "type": "string"
        },
        {
          "name": "srcReceiver",
          "type": "pubkey"
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "lockBump",
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
      "name": "lockReward",
      "discriminator": [
        66,
        69,
        228,
        16,
        76,
        50,
        65,
        157
      ],
      "accounts": [
        {
          "name": "sender",
          "writable": true,
          "signer": true,
          "relations": [
            "htlc"
          ]
        },
        {
          "name": "htlc",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "arg",
                "path": "id"
              }
            ]
          }
        },
        {
          "name": "htlcTokenAccount"
        },
        {
          "name": "tokenContract"
        },
        {
          "name": "senderTokenAccount",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "id",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "rewardTimelock",
          "type": "u64"
        },
        {
          "name": "reward",
          "type": "u64"
        },
        {
          "name": "lockBump",
          "type": "u8"
        }
      ],
      "returns": "bool"
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
          "name": "userSigning",
          "writable": true,
          "signer": true
        },
        {
          "name": "sender",
          "writable": true,
          "relations": [
            "htlc"
          ]
        },
        {
          "name": "srcReceiver",
          "relations": [
            "htlc"
          ]
        },
        {
          "name": "tokenContract",
          "relations": [
            "htlc"
          ]
        },
        {
          "name": "htlc",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "arg",
                "path": "id"
              }
            ]
          }
        },
        {
          "name": "htlcTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  104,
                  116,
                  108,
                  99,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "id"
              }
            ]
          }
        },
        {
          "name": "senderTokenAccount",
          "writable": true
        },
        {
          "name": "srcReceiverTokenAccount",
          "writable": true
        },
        {
          "name": "rewardTokenAccount",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "id",
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
          "name": "htlcBump",
          "type": "u8"
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
          "name": "userSigning",
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
                "path": "id"
              }
            ]
          }
        },
        {
          "name": "htlcTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  104,
                  116,
                  108,
                  99,
                  95,
                  116,
                  111,
                  107,
                  101,
                  110,
                  95,
                  97,
                  99,
                  99,
                  111,
                  117,
                  110,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "id"
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
          "name": "tokenContract",
          "relations": [
            "htlc"
          ]
        },
        {
          "name": "senderTokenAccount",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "id",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        },
        {
          "name": "htlcBump",
          "type": "u8"
        }
      ],
      "returns": "bool"
    }
  ],
  "accounts": [
    {
      "name": "htlc",
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
      "name": "invalidTimeLock",
      "msg": "Invalid TimeLock."
    },
    {
      "code": 6001,
      "name": "notPastTimeLock",
      "msg": "Not Past TimeLock."
    },
    {
      "code": 6002,
      "name": "invalidRewardTimeLock",
      "msg": "Invalid Reward TimeLock."
    },
    {
      "code": 6003,
      "name": "hashlockNotSet",
      "msg": "Hashlock Is Not Set."
    },
    {
      "code": 6004,
      "name": "hashlockNoMatch",
      "msg": "Does Not Match the Hashlock."
    },
    {
      "code": 6005,
      "name": "hashlockAlreadySet",
      "msg": "Hashlock Already Set."
    },
    {
      "code": 6006,
      "name": "alreadyClaimed",
      "msg": "Funds Are Alredy Claimed."
    },
    {
      "code": 6007,
      "name": "fundsNotSent",
      "msg": "Funds Can Not Be Zero."
    },
    {
      "code": 6008,
      "name": "unauthorizedAccess",
      "msg": "Unauthorized Access."
    },
    {
      "code": 6009,
      "name": "notOwner",
      "msg": "Not The Owner."
    },
    {
      "code": 6010,
      "name": "notSender",
      "msg": "Not The Sender."
    },
    {
      "code": 6011,
      "name": "notReciever",
      "msg": "Not The Reciever."
    },
    {
      "code": 6012,
      "name": "noToken",
      "msg": "Wrong Token."
    }
  ],
  "types": [
    {
      "name": "htlc",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "dstAddress",
            "type": "string"
          },
          {
            "name": "dstChain",
            "type": "string"
          },
          {
            "name": "dstAsset",
            "type": "string"
          },
          {
            "name": "srcAsset",
            "type": "string"
          },
          {
            "name": "sender",
            "type": "pubkey"
          },
          {
            "name": "srcReceiver",
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
            "name": "reward",
            "type": "u64"
          },
          {
            "name": "rewardTimelock",
            "type": "u64"
          },
          {
            "name": "tokenContract",
            "type": "pubkey"
          },
          {
            "name": "tokenWallet",
            "type": "pubkey"
          },
          {
            "name": "claimed",
            "type": "u8"
          }
        ]
      }
    }
  ]
})