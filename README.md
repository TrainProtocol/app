
<br />
<div align="left">
  <h1 align="left">UI for TRAIN web application</h1>
</div>
 
This repository contains implementation of TRAIN UI

 

### Run locally


  ```sh
  yarn
  yarn dev 
  ```

 
### Required environment variables

  ```yaml
  NEXT_PUBLIC_TRAIN_API = https://atomic-dev.layerswap.cloud/
  NEXT_PUBLIC_API_VERSION = sandbox #mainnet for mainnets


  NEXT_PUBLIC_ALCHEMY_KEY = <YOUR_ALCHEMY_KEY> #required for light client calls
  NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID = <YOUR_WALLETCONNECT_PROJECT_ID>
  ```

### Secret Generation
```
To generate a secret for an HTLC, The Dapp
1. Asks the user signs the message: "I am using TRAIN".
2. Creates an initial key from the signature using HKDF.
3. For Each swap derives a new secret from the initial key and the timelock.
4. If the initial key is lost, again asks for user signature and recovers the keys.
```

### Run Starknet Secret Generation
```
1. Run the dapp locally.
2. Choose starknet as the source chain.
3. Click on swap and sign the message.
```