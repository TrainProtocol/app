// import { Network, Token } from "../../../Models/Network";
// import type { LockDetails } from "@train-protocol/sdk";

// export default abstract class _LightClient {
//     abstract supportsNetwork: (network: Network) => boolean
//     abstract getDetails({ network, token, hashlock, atomicContract }: { network: Network, token: Token, hashlock: string, atomicContract: string }): Promise<LockDetails | undefined>
//     abstract init({ network }: { network: Network }): Promise<{ initialized: boolean } | undefined>
// }