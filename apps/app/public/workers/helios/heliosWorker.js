import * as helios from './lib.mjs';
import { ethers } from "https://cdnjs.cloudflare.com/ajax/libs/ethers/5.7.2/ethers.esm.min.js";
self.onmessage = (e) => {
    switch (e.data.type) {
        case 'init':
            initWorker(e.data.payload.data.initConfigs);
            break;
        case 'getDetails':
            getSolverLock(e.data.payload.data.lockConfigs);
            break;
        default:
            // Handle any cases that are not explicitly mentioned
            console.error('Unhandled message type:', e.data.type);
    }
};
async function initWorker(initConfigs) {
    try {
        const networkSuffix = initConfigs.version == 'sandbox' ? 'sepolia' : 'mainnet';
        const origin = self.location.origin;
        const ethCheckpoint = initConfigs.network?.toLowerCase().includes('eip155:11155111') &&
            await fetch(`${origin}/proxy/beaconchain-${networkSuffix}/checkpointz/v1/status`).then(res => res.json()).catch(() => null);
        const configs = [
            {
                name: 'eip155:11155111',
                cnfg: {
                    executionRpc: `${initConfigs.version == 'sandbox' ? 'https://eth-sepolia.g.alchemy.com/v2/' : 'https://eth-mainnet.g.alchemy.com/v2/'}${initConfigs.alchemyKey}`,
                    consensusRpc: initConfigs.version == 'sandbox' ? `${origin}/proxy/nimbus-sepolia` : undefined,
                    checkpoint: ethCheckpoint?.finality?.finalized?.root || initConfigs.version == 'sandbox' ? '0x527a8a4949bc2128d73fa4e2a022aa56881b2053ba83c900013a66eb7c93343e' : '0xf5a73de5020ab47bb6648dee250e60d6f031516327f4b858bc7f3e3ecad84c40',
                    dbType: "localstorage",
                    network: initConfigs.version == 'sandbox' ? 'sepolia' : undefined,
                },
                kind: 'ethereum'
            },
            {
                name: 'optimism',
                cnfg: {
                    executionRpc: `https://opt-mainnet.g.alchemy.com/v2/${initConfigs.alchemyKey}`,
                    network: "op-mainnet",
                },
                kind: 'opstack'
            },
            {
                name: 'base',
                cnfg: {
                    executionRpc: `https://base-mainnet.g.alchemy.com/v2/${initConfigs.alchemyKey}`,
                    network: "base",
                },
                kind: 'opstack'
            },
            {
                name: 'linea',
                cnfg: {
                    executionRpc: `https://linea-mainnet.g.alchemy.com/v2/${initConfigs.alchemyKey}`,
                    network: "mainnet",
                },
                kind: 'linea'
            }
        ];
        const networkConfig = configs.find(config => initConfigs.network?.toLowerCase().includes(config.name));
        const heliosProvider = await helios.createHeliosProvider(networkConfig.cnfg, networkConfig.kind);
        self.heliosProvider = heliosProvider;
        self.web3Provider = new ethers.providers.Web3Provider(heliosProvider);
        self.postMessage({ type: 'init', data: { initialized: true } });
    }
    catch (e) {
        self.postMessage({ type: 'init', data: { initialized: false } });
        console.log(e);
    }
}
async function getSolverLock(lockConfigs) {
    try {
        const { abi, contractAddress, hashlock, index = 1 } = lockConfigs;
        async function fetchSolverLock(provider) {
            if (provider) {
                try {
                    await self.heliosProvider.waitSynced();
                    const contract = new ethers.Contract(contractAddress, abi, provider);
                    const res = await contract.getSolverLock(hashlock, index);
                    return res;
                }
                catch (e) {
                    console.log(e);
                }
            }
        }
        (async () => {
            try {
                const data = await fetchSolverLock(self.web3Provider);
                self.postMessage({ type: 'solverLockDetails', data: data });
                return;
            }
            catch (e) {
                console.log(e);
                self.postMessage({ type: 'solverLockDetails', data: undefined });
            }
        })();
    }
    catch (e) {
        self.postMessage({ type: 'solverLockDetails', data: undefined });
        console.log(e);
    }
}
