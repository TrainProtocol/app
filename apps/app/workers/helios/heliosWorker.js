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
        const origin = self.location.origin;
        const network = initConfigs.network ?? '';
        const isEthereum = network === 'eip155:1' || network === 'eip155:11155111';
        const isSepolia = network === 'eip155:11155111';
        const consensusProxy = isSepolia ? `${origin}/proxy/nimbus-sepolia` : `${origin}/proxy/nimbus-mainnet`;
        // Fetch the current finalized checkpoint from the consensus RPC
        const ethCheckpoint = isEthereum &&
            await fetch(`${consensusProxy}/eth/v1/beacon/headers/finalized`).then(res => res.json()).then(res => res?.data?.root).catch(() => null);
        const configs = [
            {
                name: 'eip155:11155111',
                cnfg: {
                    executionRpc: `https://eth-sepolia.g.alchemy.com/v2/${initConfigs.alchemyKey}`,
                    consensusRpc: `${origin}/proxy/nimbus-sepolia`,
                    checkpoint: ethCheckpoint || '0x527a8a4949bc2128d73fa4e2a022aa56881b2053ba83c900013a66eb7c93343e',
                    dbType: "localstorage",
                    network: 'sepolia',
                },
                kind: 'ethereum'
            },
            {
                name: 'eip155:1',
                cnfg: {
                    executionRpc: `https://eth-mainnet.g.alchemy.com/v2/${initConfigs.alchemyKey}`,
                    consensusRpc: `${origin}/proxy/nimbus-mainnet`,
                    checkpoint: ethCheckpoint || '0xf5a73de5020ab47bb6648dee250e60d6f031516327f4b858bc7f3e3ecad84c40',
                    dbType: "localstorage",
                },
                kind: 'ethereum'
            },
            {
                name: 'eip155:10',
                cnfg: {
                    executionRpc: `https://opt-mainnet.g.alchemy.com/v2/${initConfigs.alchemyKey}`,
                    network: "op-mainnet",
                },
                kind: 'opstack'
            },
            {
                name: 'eip155:8453',
                cnfg: {
                    executionRpc: `https://base-mainnet.g.alchemy.com/v2/${initConfigs.alchemyKey}`,
                    network: "base",
                },
                kind: 'opstack'
            },
            {
                name: 'eip155:59144',
                cnfg: {
                    executionRpc: `https://linea-mainnet.g.alchemy.com/v2/${initConfigs.alchemyKey}`,
                    network: "mainnet",
                },
                kind: 'linea'
            }
        ];
        const networkConfig = configs.find(config => network === config.name);
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
