import init, { set_panic_hook, Beerus } from './beerus_web.js';
self.onmessage = (e) => {
    switch (e.data.type) {
        case 'init':
            initWorker(e.data.payload.data.initConfigs);
            break;
        case 'getDetails':
            console.log("getting details")
            getCommit(e.data.payload.data.commitConfigs);
            break;
        default:
            // Handle any cases that are not explicitly mentioned
            console.error('Unhandled message type:', e.data.type);
    }
};
async function initWorker(initConfigs) {
    try {
        await init();
        set_panic_hook();
        const config = JSON.stringify({
            ethereum_url: `https://eth-sepolia.g.alchemy.com/v2/${initConfigs.alchemyKey}`,
            gateway_url: 'https://alpha-sepolia.starknet.io',
            starknet_url: `https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_7/${initConfigs.alchemyKey}`
        });
        let beerus = await new Beerus(config, post);
        console.log('Beerus instance created');
        self.client = beerus;
        self.postMessage({ type: 'init', data: { initialized: true } });
    }
    catch (e) {
        debugger
        console.log("brrrusserrror", e.message)
        self.postMessage({ type: 'init', data: { initialized: false } });
        console.log(e);
    }
}
const functionSignature = "getHTLCDetails(uint256)";
const functionSelector = getFunctionSelector(functionSignature);
function getFunctionSelector(functionSignature) {
    return keccak256(functionSignature).slice(0, 8); // First 4 bytes of the hash
}

function encodeArguments(Id) {
    // Assuming Id is passed as an integer
    return [BigInt(Id)];
}
async function getCommit(commitConfigs) {
    try {
        const { commitId, contractAddress } = commitConfigs;
        const encodedArguments = encodeArguments(commitId);
        const callData = encodedArguments.map(arg => arg.toString(16).padStart(64, '0')).join('');
        debugger
        async function getCommitDetails() {
            try {
                const call = {
                    "execute": {
                        callData,
                        "contract_address": contractAddress,
                        "entry_point_selector": functionSelector
                    }
                };
                const res = await starknetCall(call);
                console.log("strknet res", res)
                return res;
            }
            catch (e) {
                console.log(e);
            }
        }
        let getDetailsHandler = undefined;
        (async () => {
            let attempts = 0;
            getDetailsHandler = setInterval(async () => {
                try {
                    if (attempts > 15) {
                        clearInterval(getDetailsHandler);
                        self.postMessage({ type: 'commitDetails', data: null });
                        return;
                    }
                    attempts++;
                    const data = await getCommitDetails();
                    if (data?.hashlock && data?.hashlock !== "0x0100000000000000000000000000000000000000000000000000000000000000" && data?.hashlock !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
                        self.postMessage({ type: 'commitDetails', data: data });
                        clearInterval(getDetailsHandler);
                    }
                }
                catch (e) {
                    console.log(e);
                }
            }, 5000);
        })();
    }
    catch (e) {
        self.postMessage({ type: 'commitDetails', data: undefined });
        console.log(e);
    }
}
async function starknetCall(commitConfigs) {
    let request = commitConfigs;
    if (request.hasOwnProperty('state')) {
        try {
            let state = await self.client.get_state();
            return state;
        }
        catch (e) {
            console.error(e);
            let error = sanitize(e.toString());
            return error;
        }
    }
    else if (request.hasOwnProperty('execute')) {
        let req = JSON.stringify(request['execute']);
        try {
            let result = await self.client.execute(req);
            return result;
        }
        catch (e) {
            console.error(e);
            let error = sanitize(e.toString());
            return error;
        }
    }
    else {
        console.error('worker: unknown request: ', commitConfigs.data);
        return "unknown request";
    }
}
;
function post(url, body) {
    let call = method(body);
    let now = performance.now();
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, false);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.send(body);
    let ms = performance.now() - now;
    if (xhr.status != 200) {
        console.error(`call to ${call} completed in ${ms} ms`);
        throw new Error(xhr.statusText);
    }
    console.debug(`call to ${call} completed in ${ms} ms`);
    return xhr.responseText;
}
function method(body) {
    try {
        let json = JSON.parse(body);
        return json.method;
    }
    catch (e) {
        return "unknown";
    }
}
function sanitize(s) {
    return s.split(/\r?\n/)[0]
        .replaceAll('\"', '\'')
        .replaceAll('\\\'', '\'');
}
