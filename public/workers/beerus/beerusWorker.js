import init, { set_panic_hook, Beerus } from './beerus_web.js';
self.onmessage = (e) => {
    switch (e.data.type) {
        case 'init':
            initWorker(e.data.payload.data.initConfigs);
            break;
        case 'getDetails':
            console.log("getting details");
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
        console.log("brrrusserrror", e.message);
        self.postMessage({ type: 'init', data: { initialized: false } });
        console.log(e);
    }
}
async function getCommit(commitConfigs) {
    try {
        const { call } = commitConfigs;
        try {
            const rawData = await starknetCall(call);
            const parsedData = JSON.parse(rawData);
            self.postMessage({ type: 'commitDetails', data: parsedData });
        }
        catch (e) {
            console.log(e);
        }
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
            let state = await self.client.get_state();
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
