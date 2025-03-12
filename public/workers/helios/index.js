let wasm;
let WASM_VECTOR_LEN = 0;
let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}
const cachedTextEncoder = (typeof TextEncoder !== 'undefined' ? new TextEncoder('utf-8') : { encode: () => { throw Error('TextEncoder not available'); } });
const encodeString = (typeof cachedTextEncoder.encodeInto === 'function'
    ? function (arg, view) {
        return cachedTextEncoder.encodeInto(arg, view);
    }
    : function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    });
function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }
    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;
    const mem = getUint8ArrayMemory0();
    let offset = 0;
    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F)
            break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = encodeString(arg, view);
        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }
    WASM_VECTOR_LEN = offset;
    return ptr;
}
let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}
const cachedTextDecoder = (typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8', { ignoreBOM: true, fatal: true }) : { decode: () => { throw Error('TextDecoder not available'); } });
if (typeof TextDecoder !== 'undefined') {
    cachedTextDecoder.decode();
}
;
function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}
function addToExternrefTable0(obj) {
    const idx = wasm.__externref_table_alloc();
    wasm.__wbindgen_export_4.set(idx, obj);
    return idx;
}
function handleError(f, args) {
    try {
        return f.apply(this, args);
    }
    catch (e) {
        const idx = addToExternrefTable0(e);
        wasm.__wbindgen_exn_store(idx);
    }
}
function isLikeNone(x) {
    return x === undefined || x === null;
}
const CLOSURE_DTORS = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => { }, unregister: () => { } }
    : new FinalizationRegistry(state => {
        wasm.__wbindgen_export_6.get(state.dtor)(state.a, state.b);
    });
function makeMutClosure(arg0, arg1, dtor, f) {
    const state = { a: arg0, b: arg1, cnt: 1, dtor };
    const real = (...args) => {
        // First up with a closure we increment the internal reference
        // count. This ensures that the Rust closure environment won't
        // be deallocated while we're invoking it.
        state.cnt++;
        const a = state.a;
        state.a = 0;
        try {
            return f(a, state.b, ...args);
        }
        finally {
            if (--state.cnt === 0) {
                wasm.__wbindgen_export_6.get(state.dtor)(a, state.b);
                CLOSURE_DTORS.unregister(state);
            }
            else {
                state.a = a;
            }
        }
    };
    real.original = state;
    CLOSURE_DTORS.register(real, state, state);
    return real;
}
function debugString(val) {
    // primitive types
    const type = typeof val;
    if (type == 'number' || type == 'boolean' || val == null) {
        return `${val}`;
    }
    if (type == 'string') {
        return `"${val}"`;
    }
    if (type == 'symbol') {
        const description = val.description;
        if (description == null) {
            return 'Symbol';
        }
        else {
            return `Symbol(${description})`;
        }
    }
    if (type == 'function') {
        const name = val.name;
        if (typeof name == 'string' && name.length > 0) {
            return `Function(${name})`;
        }
        else {
            return 'Function';
        }
    }
    // objects
    if (Array.isArray(val)) {
        const length = val.length;
        let debug = '[';
        if (length > 0) {
            debug += debugString(val[0]);
        }
        for (let i = 1; i < length; i++) {
            debug += ', ' + debugString(val[i]);
        }
        debug += ']';
        return debug;
    }
    // Test for built-in
    const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
    let className;
    if (builtInMatches && builtInMatches.length > 1) {
        className = builtInMatches[1];
    }
    else {
        // Failed to match the standard '[object ClassName]'
        return toString.call(val);
    }
    if (className == 'Object') {
        // we're a user defined class or Object
        // JSON.stringify avoids problems with cycles, and is generally much
        // easier than looping through ownProperties of `val`.
        try {
            return 'Object(' + JSON.stringify(val) + ')';
        }
        catch (_) {
            return 'Object';
        }
    }
    // errors
    if (val instanceof Error) {
        return `${val.name}: ${val.message}\n${val.stack}`;
    }
    // TODO we could test for more things here, like `Set`s and `Map`s.
    return className;
}
function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_export_4.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}
function __wbg_adapter_52(arg0, arg1, arg2) {
    wasm.closure284_externref_shim(arg0, arg1, arg2);
}
function __wbg_adapter_55(arg0, arg1) {
    wasm._dyn_core__ops__function__FnMut_____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__h1a810c12566889eb(arg0, arg1);
}
function __wbg_adapter_182(arg0, arg1, arg2, arg3) {
    wasm.closure224_externref_shim(arg0, arg1, arg2, arg3);
}
const __wbindgen_enum_RequestCredentials = ["omit", "same-origin", "include"];
const __wbindgen_enum_RequestMode = ["same-origin", "no-cors", "cors", "navigate"];
const EthereumClientFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => { }, unregister: () => { } }
    : new FinalizationRegistry(ptr => wasm.__wbg_ethereumclient_free(ptr >>> 0, 1));
export class EthereumClient {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        EthereumClientFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_ethereumclient_free(ptr, 0);
    }
    /**
     * @param {string | null | undefined} execution_rpc
     * @param {string | null | undefined} execution_verifiable_api
     * @param {string | null | undefined} consensus_rpc
     * @param {string} network
     * @param {string | null | undefined} checkpoint
     * @param {string} db_type
     */
    constructor(execution_rpc, execution_verifiable_api, consensus_rpc, network, checkpoint, db_type) {
        var ptr0 = isLikeNone(execution_rpc) ? 0 : passStringToWasm0(execution_rpc, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        var ptr1 = isLikeNone(execution_verifiable_api) ? 0 : passStringToWasm0(execution_verifiable_api, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        var ptr2 = isLikeNone(consensus_rpc) ? 0 : passStringToWasm0(consensus_rpc, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len2 = WASM_VECTOR_LEN;
        const ptr3 = passStringToWasm0(network, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len3 = WASM_VECTOR_LEN;
        var ptr4 = isLikeNone(checkpoint) ? 0 : passStringToWasm0(checkpoint, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len4 = WASM_VECTOR_LEN;
        const ptr5 = passStringToWasm0(db_type, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len5 = WASM_VECTOR_LEN;
        const ret = wasm.ethereumclient_new(ptr0, len0, ptr1, len1, ptr2, len2, ptr3, len3, ptr4, len4, ptr5, len5);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        this.__wbg_ptr = ret[0] >>> 0;
        EthereumClientFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @returns {Promise<void>}
     */
    sync() {
        const ret = wasm.ethereumclient_sync(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {Promise<void>}
     */
    wait_synced() {
        const ret = wasm.ethereumclient_wait_synced(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    chain_id() {
        const ret = wasm.ethereumclient_chain_id(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {Promise<number>}
     */
    get_block_number() {
        const ret = wasm.ethereumclient_get_block_number(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {any} addr
     * @param {any} block
     * @returns {Promise<string>}
     */
    get_balance(addr, block) {
        const ret = wasm.ethereumclient_get_balance(this.__wbg_ptr, addr, block);
        return ret;
    }
    /**
     * @param {string} hash
     * @returns {Promise<any>}
     */
    get_transaction_by_hash(hash) {
        const ptr0 = passStringToWasm0(hash, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.ethereumclient_get_transaction_by_hash(this.__wbg_ptr, ptr0, len0);
        return ret;
    }
    /**
     * @param {any} hash
     * @param {any} index
     * @returns {Promise<any>}
     */
    get_transaction_by_block_hash_and_index(hash, index) {
        const ret = wasm.ethereumclient_get_transaction_by_block_hash_and_index(this.__wbg_ptr, hash, index);
        return ret;
    }
    /**
     * @param {any} block
     * @param {any} index
     * @returns {Promise<any>}
     */
    get_transaction_by_block_number_and_index(block, index) {
        const ret = wasm.ethereumclient_get_transaction_by_block_number_and_index(this.__wbg_ptr, block, index);
        return ret;
    }
    /**
     * @param {any} addr
     * @param {any} block
     * @returns {Promise<number>}
     */
    get_transaction_count(addr, block) {
        const ret = wasm.ethereumclient_get_transaction_count(this.__wbg_ptr, addr, block);
        return ret;
    }
    /**
     * @param {any} hash
     * @returns {Promise<number | undefined>}
     */
    get_block_transaction_count_by_hash(hash) {
        const ret = wasm.ethereumclient_get_block_transaction_count_by_hash(this.__wbg_ptr, hash);
        return ret;
    }
    /**
     * @param {any} block
     * @returns {Promise<number | undefined>}
     */
    get_block_transaction_count_by_number(block) {
        const ret = wasm.ethereumclient_get_block_transaction_count_by_number(this.__wbg_ptr, block);
        return ret;
    }
    /**
     * @param {any} block
     * @param {boolean} full_tx
     * @returns {Promise<any>}
     */
    get_block_by_number(block, full_tx) {
        const ret = wasm.ethereumclient_get_block_by_number(this.__wbg_ptr, block, full_tx);
        return ret;
    }
    /**
     * @param {string} hash
     * @param {boolean} full_tx
     * @returns {Promise<any>}
     */
    get_block_by_hash(hash, full_tx) {
        const ptr0 = passStringToWasm0(hash, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.ethereumclient_get_block_by_hash(this.__wbg_ptr, ptr0, len0, full_tx);
        return ret;
    }
    /**
     * @param {any} addr
     * @param {any} block
     * @returns {Promise<string>}
     */
    get_code(addr, block) {
        const ret = wasm.ethereumclient_get_code(this.__wbg_ptr, addr, block);
        return ret;
    }
    /**
     * @param {any} address
     * @param {any} slot
     * @param {any} block
     * @returns {Promise<any>}
     */
    get_storage_at(address, slot, block) {
        const ret = wasm.ethereumclient_get_storage_at(this.__wbg_ptr, address, slot, block);
        return ret;
    }
    /**
     * @param {any} address
     * @param {any} storage_keys
     * @param {any} block
     * @returns {Promise<any>}
     */
    get_proof(address, storage_keys, block) {
        const ret = wasm.ethereumclient_get_proof(this.__wbg_ptr, address, storage_keys, block);
        return ret;
    }
    /**
     * @param {any} opts
     * @param {any} block
     * @returns {Promise<string>}
     */
    call(opts, block) {
        const ret = wasm.ethereumclient_call(this.__wbg_ptr, opts, block);
        return ret;
    }
    /**
     * @param {any} opts
     * @param {any} block
     * @returns {Promise<number>}
     */
    estimate_gas(opts, block) {
        const ret = wasm.ethereumclient_estimate_gas(this.__wbg_ptr, opts, block);
        return ret;
    }
    /**
     * @param {any} opts
     * @param {any} block
     * @returns {Promise<any>}
     */
    create_access_list(opts, block) {
        const ret = wasm.ethereumclient_create_access_list(this.__wbg_ptr, opts, block);
        return ret;
    }
    /**
     * @returns {Promise<any>}
     */
    gas_price() {
        const ret = wasm.ethereumclient_gas_price(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {Promise<any>}
     */
    max_priority_fee_per_gas() {
        const ret = wasm.ethereumclient_max_priority_fee_per_gas(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {string} tx
     * @returns {Promise<any>}
     */
    send_raw_transaction(tx) {
        const ptr0 = passStringToWasm0(tx, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.ethereumclient_send_raw_transaction(this.__wbg_ptr, ptr0, len0);
        return ret;
    }
    /**
     * @param {any} tx
     * @returns {Promise<any>}
     */
    get_transaction_receipt(tx) {
        const ret = wasm.ethereumclient_get_transaction_receipt(this.__wbg_ptr, tx);
        return ret;
    }
    /**
     * @param {any} block
     * @returns {Promise<any>}
     */
    get_block_receipts(block) {
        const ret = wasm.ethereumclient_get_block_receipts(this.__wbg_ptr, block);
        return ret;
    }
    /**
     * @param {any} filter
     * @returns {Promise<any>}
     */
    get_logs(filter) {
        const ret = wasm.ethereumclient_get_logs(this.__wbg_ptr, filter);
        return ret;
    }
    /**
     * @param {any} filter_id
     * @returns {Promise<any>}
     */
    get_filter_changes(filter_id) {
        const ret = wasm.ethereumclient_get_filter_changes(this.__wbg_ptr, filter_id);
        return ret;
    }
    /**
     * @param {any} filter_id
     * @returns {Promise<any>}
     */
    get_filter_logs(filter_id) {
        const ret = wasm.ethereumclient_get_filter_logs(this.__wbg_ptr, filter_id);
        return ret;
    }
    /**
     * @param {any} filter_id
     * @returns {Promise<boolean>}
     */
    uninstall_filter(filter_id) {
        const ret = wasm.ethereumclient_uninstall_filter(this.__wbg_ptr, filter_id);
        return ret;
    }
    /**
     * @param {any} filter
     * @returns {Promise<any>}
     */
    new_filter(filter) {
        const ret = wasm.ethereumclient_new_filter(this.__wbg_ptr, filter);
        return ret;
    }
    /**
     * @returns {Promise<any>}
     */
    new_block_filter() {
        const ret = wasm.ethereumclient_new_block_filter(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {Promise<any>}
     */
    new_pending_transaction_filter() {
        const ret = wasm.ethereumclient_new_pending_transaction_filter(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {Promise<string>}
     */
    client_version() {
        const ret = wasm.ethereumclient_client_version(this.__wbg_ptr);
        return ret;
    }
}
const OpStackClientFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => { }, unregister: () => { } }
    : new FinalizationRegistry(ptr => wasm.__wbg_opstackclient_free(ptr >>> 0, 1));
export class OpStackClient {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        OpStackClientFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_opstackclient_free(ptr, 0);
    }
    /**
     * @param {string | null | undefined} execution_rpc
     * @param {string | null | undefined} execution_verifiable_api
     * @param {string} network
     */
    constructor(execution_rpc, execution_verifiable_api, network) {
        var ptr0 = isLikeNone(execution_rpc) ? 0 : passStringToWasm0(execution_rpc, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        var ptr1 = isLikeNone(execution_verifiable_api) ? 0 : passStringToWasm0(execution_verifiable_api, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(network, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len2 = WASM_VECTOR_LEN;
        const ret = wasm.opstackclient_new(ptr0, len0, ptr1, len1, ptr2, len2);
        if (ret[2]) {
            throw takeFromExternrefTable0(ret[1]);
        }
        this.__wbg_ptr = ret[0] >>> 0;
        OpStackClientFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @returns {Promise<void>}
     */
    sync() {
        const ret = wasm.opstackclient_sync(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {Promise<void>}
     */
    wait_synced() {
        const ret = wasm.opstackclient_wait_synced(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    chain_id() {
        const ret = wasm.opstackclient_chain_id(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {Promise<number>}
     */
    get_block_number() {
        const ret = wasm.opstackclient_get_block_number(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {any} addr
     * @param {any} block
     * @returns {Promise<string>}
     */
    get_balance(addr, block) {
        const ret = wasm.opstackclient_get_balance(this.__wbg_ptr, addr, block);
        return ret;
    }
    /**
     * @param {string} hash
     * @returns {Promise<any>}
     */
    get_transaction_by_hash(hash) {
        const ptr0 = passStringToWasm0(hash, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.opstackclient_get_transaction_by_hash(this.__wbg_ptr, ptr0, len0);
        return ret;
    }
    /**
     * @param {any} hash
     * @param {any} index
     * @returns {Promise<any>}
     */
    get_transaction_by_block_hash_and_index(hash, index) {
        const ret = wasm.opstackclient_get_transaction_by_block_hash_and_index(this.__wbg_ptr, hash, index);
        return ret;
    }
    /**
     * @param {any} block
     * @param {any} index
     * @returns {Promise<any>}
     */
    get_transaction_by_block_number_and_index(block, index) {
        const ret = wasm.opstackclient_get_transaction_by_block_number_and_index(this.__wbg_ptr, block, index);
        return ret;
    }
    /**
     * @param {any} addr
     * @param {any} block
     * @returns {Promise<number>}
     */
    get_transaction_count(addr, block) {
        const ret = wasm.opstackclient_get_transaction_count(this.__wbg_ptr, addr, block);
        return ret;
    }
    /**
     * @param {any} hash
     * @returns {Promise<number | undefined>}
     */
    get_block_transaction_count_by_hash(hash) {
        const ret = wasm.opstackclient_get_block_transaction_count_by_hash(this.__wbg_ptr, hash);
        return ret;
    }
    /**
     * @param {any} block
     * @returns {Promise<number | undefined>}
     */
    get_block_transaction_count_by_number(block) {
        const ret = wasm.opstackclient_get_block_transaction_count_by_number(this.__wbg_ptr, block);
        return ret;
    }
    /**
     * @param {any} block
     * @param {boolean} full_tx
     * @returns {Promise<any>}
     */
    get_block_by_number(block, full_tx) {
        const ret = wasm.opstackclient_get_block_by_number(this.__wbg_ptr, block, full_tx);
        return ret;
    }
    /**
     * @param {string} hash
     * @param {boolean} full_tx
     * @returns {Promise<any>}
     */
    get_block_by_hash(hash, full_tx) {
        const ptr0 = passStringToWasm0(hash, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.opstackclient_get_block_by_hash(this.__wbg_ptr, ptr0, len0, full_tx);
        return ret;
    }
    /**
     * @param {any} addr
     * @param {any} block
     * @returns {Promise<string>}
     */
    get_code(addr, block) {
        const ret = wasm.opstackclient_get_code(this.__wbg_ptr, addr, block);
        return ret;
    }
    /**
     * @param {any} address
     * @param {any} slot
     * @param {any} block
     * @returns {Promise<any>}
     */
    get_storage_at(address, slot, block) {
        const ret = wasm.opstackclient_get_storage_at(this.__wbg_ptr, address, slot, block);
        return ret;
    }
    /**
     * @param {any} address
     * @param {any} storage_keys
     * @param {any} block
     * @returns {Promise<any>}
     */
    get_proof(address, storage_keys, block) {
        const ret = wasm.opstackclient_get_proof(this.__wbg_ptr, address, storage_keys, block);
        return ret;
    }
    /**
     * @param {any} opts
     * @param {any} block
     * @returns {Promise<string>}
     */
    call(opts, block) {
        const ret = wasm.opstackclient_call(this.__wbg_ptr, opts, block);
        return ret;
    }
    /**
     * @param {any} opts
     * @param {any} block
     * @returns {Promise<number>}
     */
    estimate_gas(opts, block) {
        const ret = wasm.opstackclient_estimate_gas(this.__wbg_ptr, opts, block);
        return ret;
    }
    /**
     * @param {any} opts
     * @param {any} block
     * @returns {Promise<any>}
     */
    create_access_list(opts, block) {
        const ret = wasm.opstackclient_create_access_list(this.__wbg_ptr, opts, block);
        return ret;
    }
    /**
     * @returns {Promise<any>}
     */
    gas_price() {
        const ret = wasm.opstackclient_gas_price(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {Promise<any>}
     */
    max_priority_fee_per_gas() {
        const ret = wasm.opstackclient_max_priority_fee_per_gas(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {string} tx
     * @returns {Promise<any>}
     */
    send_raw_transaction(tx) {
        const ptr0 = passStringToWasm0(tx, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.opstackclient_send_raw_transaction(this.__wbg_ptr, ptr0, len0);
        return ret;
    }
    /**
     * @param {any} tx
     * @returns {Promise<any>}
     */
    get_transaction_receipt(tx) {
        const ret = wasm.opstackclient_get_transaction_receipt(this.__wbg_ptr, tx);
        return ret;
    }
    /**
     * @param {any} block
     * @returns {Promise<any>}
     */
    get_block_receipts(block) {
        const ret = wasm.opstackclient_get_block_receipts(this.__wbg_ptr, block);
        return ret;
    }
    /**
     * @param {any} filter
     * @returns {Promise<any>}
     */
    get_logs(filter) {
        const ret = wasm.opstackclient_get_logs(this.__wbg_ptr, filter);
        return ret;
    }
    /**
     * @param {any} filter_id
     * @returns {Promise<any>}
     */
    get_filter_changes(filter_id) {
        const ret = wasm.opstackclient_get_filter_changes(this.__wbg_ptr, filter_id);
        return ret;
    }
    /**
     * @param {any} filter_id
     * @returns {Promise<any>}
     */
    get_filter_logs(filter_id) {
        const ret = wasm.opstackclient_get_filter_logs(this.__wbg_ptr, filter_id);
        return ret;
    }
    /**
     * @param {any} filter_id
     * @returns {Promise<boolean>}
     */
    uninstall_filter(filter_id) {
        const ret = wasm.opstackclient_uninstall_filter(this.__wbg_ptr, filter_id);
        return ret;
    }
    /**
     * @param {any} filter
     * @returns {Promise<any>}
     */
    new_filter(filter) {
        const ret = wasm.opstackclient_new_filter(this.__wbg_ptr, filter);
        return ret;
    }
    /**
     * @returns {Promise<any>}
     */
    new_block_filter() {
        const ret = wasm.opstackclient_new_block_filter(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {Promise<any>}
     */
    new_pending_transaction_filter() {
        const ret = wasm.opstackclient_new_pending_transaction_filter(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {Promise<string>}
     */
    client_version() {
        const ret = wasm.opstackclient_client_version(this.__wbg_ptr);
        return ret;
    }
}
async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            }
            catch (e) {
                if (module.headers.get('Content-Type') != 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);
                }
                else {
                    throw e;
                }
            }
        }
        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    }
    else {
        const instance = await WebAssembly.instantiate(module, imports);
        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        }
        else {
            return instance;
        }
    }
}
function __wbg_get_imports() {
    const imports = {};
    imports.wbg = {};
    imports.wbg.__wbg_String_8f0eb39a4a4c2f66 = function (arg0, arg1) {
        const ret = String(arg1);
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    };
    imports.wbg.__wbg_abort_775ef1d17fc65868 = function (arg0) {
        arg0.abort();
    };
    imports.wbg.__wbg_append_8c7dd8d641a5f01b = function () {
        return handleError(function (arg0, arg1, arg2, arg3, arg4) {
            arg0.append(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
        }, arguments);
    };
    imports.wbg.__wbg_arrayBuffer_d1b44c4390db422f = function () {
        return handleError(function (arg0) {
            const ret = arg0.arrayBuffer();
            return ret;
        }, arguments);
    };
    imports.wbg.__wbg_buffer_609cc3eee51ed158 = function (arg0) {
        const ret = arg0.buffer;
        return ret;
    };
    imports.wbg.__wbg_call_672a4d21634d4a24 = function () {
        return handleError(function (arg0, arg1) {
            const ret = arg0.call(arg1);
            return ret;
        }, arguments);
    };
    imports.wbg.__wbg_call_7cccdd69e0791ae2 = function () {
        return handleError(function (arg0, arg1, arg2) {
            const ret = arg0.call(arg1, arg2);
            return ret;
        }, arguments);
    };
    imports.wbg.__wbg_done_769e5ede4b31c67b = function (arg0) {
        const ret = arg0.done;
        return ret;
    };
    imports.wbg.__wbg_entries_3265d4158b33e5dc = function (arg0) {
        const ret = Object.entries(arg0);
        return ret;
    };
    imports.wbg.__wbg_error_7534b8e9a36f1ab4 = function (arg0, arg1) {
        let deferred0_0;
        let deferred0_1;
        try {
            deferred0_0 = arg0;
            deferred0_1 = arg1;
            console.error(getStringFromWasm0(arg0, arg1));
        }
        finally {
            wasm.__wbindgen_free(deferred0_0, deferred0_1, 1);
        }
    };
    imports.wbg.__wbg_fetch_4465c2b10f21a927 = function (arg0) {
        const ret = fetch(arg0);
        return ret;
    };
    imports.wbg.__wbg_fetch_509096533071c657 = function (arg0, arg1) {
        const ret = arg0.fetch(arg1);
        return ret;
    };
    imports.wbg.__wbg_getItem_17f98dee3b43fa7e = function () {
        return handleError(function (arg0, arg1, arg2, arg3) {
            const ret = arg1.getItem(getStringFromWasm0(arg2, arg3));
            var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            var len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        }, arguments);
    };
    imports.wbg.__wbg_get_67b2ba62fc30de12 = function () {
        return handleError(function (arg0, arg1) {
            const ret = Reflect.get(arg0, arg1);
            return ret;
        }, arguments);
    };
    imports.wbg.__wbg_get_b9b93047fe3cf45b = function (arg0, arg1) {
        const ret = arg0[arg1 >>> 0];
        return ret;
    };
    imports.wbg.__wbg_getwithrefkey_1dc361bd10053bfe = function (arg0, arg1) {
        const ret = arg0[arg1];
        return ret;
    };
    imports.wbg.__wbg_has_a5ea9117f258a0ec = function () {
        return handleError(function (arg0, arg1) {
            const ret = Reflect.has(arg0, arg1);
            return ret;
        }, arguments);
    };
    imports.wbg.__wbg_headers_9cb51cfd2ac780a4 = function (arg0) {
        const ret = arg0.headers;
        return ret;
    };
    imports.wbg.__wbg_instanceof_ArrayBuffer_e14585432e3737fc = function (arg0) {
        let result;
        try {
            result = arg0 instanceof ArrayBuffer;
        }
        catch (_) {
            result = false;
        }
        const ret = result;
        return ret;
    };
    imports.wbg.__wbg_instanceof_Map_f3469ce2244d2430 = function (arg0) {
        let result;
        try {
            result = arg0 instanceof Map;
        }
        catch (_) {
            result = false;
        }
        const ret = result;
        return ret;
    };
    imports.wbg.__wbg_instanceof_Response_f2cc20d9f7dfd644 = function (arg0) {
        let result;
        try {
            result = arg0 instanceof Response;
        }
        catch (_) {
            result = false;
        }
        const ret = result;
        return ret;
    };
    imports.wbg.__wbg_instanceof_Uint8Array_17156bcf118086a9 = function (arg0) {
        let result;
        try {
            result = arg0 instanceof Uint8Array;
        }
        catch (_) {
            result = false;
        }
        const ret = result;
        return ret;
    };
    imports.wbg.__wbg_instanceof_Window_def73ea0955fc569 = function (arg0) {
        let result;
        try {
            result = arg0 instanceof Window;
        }
        catch (_) {
            result = false;
        }
        const ret = result;
        return ret;
    };
    imports.wbg.__wbg_instanceof_WorkerGlobalScope_dbdbdea7e3b56493 = function (arg0) {
        let result;
        try {
            result = arg0 instanceof WorkerGlobalScope;
        }
        catch (_) {
            result = false;
        }
        const ret = result;
        return ret;
    };
    imports.wbg.__wbg_isArray_a1eab7e0d067391b = function (arg0) {
        const ret = Array.isArray(arg0);
        return ret;
    };
    imports.wbg.__wbg_isSafeInteger_343e2beeeece1bb0 = function (arg0) {
        const ret = Number.isSafeInteger(arg0);
        return ret;
    };
    imports.wbg.__wbg_iterator_9a24c88df860dc65 = function () {
        const ret = Symbol.iterator;
        return ret;
    };
    imports.wbg.__wbg_length_a446193dc22c12f8 = function (arg0) {
        const ret = arg0.length;
        return ret;
    };
    imports.wbg.__wbg_length_e2d2a49132c1b256 = function (arg0) {
        const ret = arg0.length;
        return ret;
    };
    imports.wbg.__wbg_localStorage_1406c99c39728187 = function () {
        return handleError(function (arg0) {
            const ret = arg0.localStorage;
            return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
        }, arguments);
    };
    imports.wbg.__wbg_new_018dcc2d6c8c2f6a = function () {
        return handleError(function () {
            const ret = new Headers();
            return ret;
        }, arguments);
    };
    imports.wbg.__wbg_new_23a2665fac83c611 = function (arg0, arg1) {
        try {
            var state0 = { a: arg0, b: arg1 };
            var cb0 = (arg0, arg1) => {
                const a = state0.a;
                state0.a = 0;
                try {
                    return __wbg_adapter_182(a, state0.b, arg0, arg1);
                }
                finally {
                    state0.a = a;
                }
            };
            const ret = new Promise(cb0);
            return ret;
        }
        finally {
            state0.a = state0.b = 0;
        }
    };
    imports.wbg.__wbg_new_405e22f390576ce2 = function () {
        const ret = new Object();
        return ret;
    };
    imports.wbg.__wbg_new_5e0be73521bc8c17 = function () {
        const ret = new Map();
        return ret;
    };
    imports.wbg.__wbg_new_78feb108b6472713 = function () {
        const ret = new Array();
        return ret;
    };
    imports.wbg.__wbg_new_8a6f238a6ece86ea = function () {
        const ret = new Error();
        return ret;
    };
    imports.wbg.__wbg_new_a12002a7f91c75be = function (arg0) {
        const ret = new Uint8Array(arg0);
        return ret;
    };
    imports.wbg.__wbg_new_e25e5aab09ff45db = function () {
        return handleError(function () {
            const ret = new AbortController();
            return ret;
        }, arguments);
    };
    imports.wbg.__wbg_newnoargs_105ed471475aaf50 = function (arg0, arg1) {
        const ret = new Function(getStringFromWasm0(arg0, arg1));
        return ret;
    };
    imports.wbg.__wbg_newwithbyteoffsetandlength_d97e637ebe145a9a = function (arg0, arg1, arg2) {
        const ret = new Uint8Array(arg0, arg1 >>> 0, arg2 >>> 0);
        return ret;
    };
    imports.wbg.__wbg_newwithstrandinit_06c535e0a867c635 = function () {
        return handleError(function (arg0, arg1, arg2) {
            const ret = new Request(getStringFromWasm0(arg0, arg1), arg2);
            return ret;
        }, arguments);
    };
    imports.wbg.__wbg_next_25feadfc0913fea9 = function (arg0) {
        const ret = arg0.next;
        return ret;
    };
    imports.wbg.__wbg_next_6574e1a8a62d1055 = function () {
        return handleError(function (arg0) {
            const ret = arg0.next();
            return ret;
        }, arguments);
    };
    imports.wbg.__wbg_now_71123b9940376874 = function (arg0) {
        const ret = arg0.now();
        return ret;
    };
    imports.wbg.__wbg_now_807e54c39636c349 = function () {
        const ret = Date.now();
        return ret;
    };
    imports.wbg.__wbg_now_d18023d54d4e5500 = function (arg0) {
        const ret = arg0.now();
        return ret;
    };
    imports.wbg.__wbg_now_fb0466b5460cff09 = function (arg0) {
        const ret = arg0.now();
        return ret;
    };
    imports.wbg.__wbg_performance_1a2515c93daf8b0c = function (arg0) {
        const ret = arg0.performance;
        return ret;
    };
    imports.wbg.__wbg_performance_71b063e177862740 = function (arg0) {
        const ret = arg0.performance;
        return ret;
    };
    imports.wbg.__wbg_queueMicrotask_97d92b4fcc8a61c5 = function (arg0) {
        queueMicrotask(arg0);
    };
    imports.wbg.__wbg_queueMicrotask_d3219def82552485 = function (arg0) {
        const ret = arg0.queueMicrotask;
        return ret;
    };
    imports.wbg.__wbg_resolve_4851785c9c5f573d = function (arg0) {
        const ret = Promise.resolve(arg0);
        return ret;
    };
    imports.wbg.__wbg_setItem_212ecc915942ab0a = function () {
        return handleError(function (arg0, arg1, arg2, arg3, arg4) {
            arg0.setItem(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
        }, arguments);
    };
    imports.wbg.__wbg_setTimeout_25eabdb2fc442ea2 = function () {
        return handleError(function (arg0, arg1, arg2) {
            const ret = arg0.setTimeout(arg1, arg2);
            return ret;
        }, arguments);
    };
    imports.wbg.__wbg_setTimeout_b4ee584b3f982e97 = function () {
        return handleError(function (arg0, arg1, arg2) {
            const ret = arg0.setTimeout(arg1, arg2);
            return ret;
        }, arguments);
    };
    imports.wbg.__wbg_setTimeout_efd7c11531df1743 = function () {
        return handleError(function (arg0, arg1, arg2) {
            const ret = arg0.setTimeout(arg1, arg2);
            return ret;
        }, arguments);
    };
    imports.wbg.__wbg_setTimeout_f2fe5af8e3debeb3 = function () {
        return handleError(function (arg0, arg1, arg2) {
            const ret = arg0.setTimeout(arg1, arg2);
            return ret;
        }, arguments);
    };
    imports.wbg.__wbg_set_37837023f3d740e8 = function (arg0, arg1, arg2) {
        arg0[arg1 >>> 0] = arg2;
    };
    imports.wbg.__wbg_set_3f1d0b984ed272ed = function (arg0, arg1, arg2) {
        arg0[arg1] = arg2;
    };
    imports.wbg.__wbg_set_65595bdd868b3009 = function (arg0, arg1, arg2) {
        arg0.set(arg1, arg2 >>> 0);
    };
    imports.wbg.__wbg_set_8fc6bf8a5b1071d1 = function (arg0, arg1, arg2) {
        const ret = arg0.set(arg1, arg2);
        return ret;
    };
    imports.wbg.__wbg_setbody_5923b78a95eedf29 = function (arg0, arg1) {
        arg0.body = arg1;
    };
    imports.wbg.__wbg_setcredentials_c3a22f1cd105a2c6 = function (arg0, arg1) {
        arg0.credentials = __wbindgen_enum_RequestCredentials[arg1];
    };
    imports.wbg.__wbg_setheaders_834c0bdb6a8949ad = function (arg0, arg1) {
        arg0.headers = arg1;
    };
    imports.wbg.__wbg_setmethod_3c5280fe5d890842 = function (arg0, arg1, arg2) {
        arg0.method = getStringFromWasm0(arg1, arg2);
    };
    imports.wbg.__wbg_setmode_5dc300b865044b65 = function (arg0, arg1) {
        arg0.mode = __wbindgen_enum_RequestMode[arg1];
    };
    imports.wbg.__wbg_setsignal_75b21ef3a81de905 = function (arg0, arg1) {
        arg0.signal = arg1;
    };
    imports.wbg.__wbg_signal_aaf9ad74119f20a4 = function (arg0) {
        const ret = arg0.signal;
        return ret;
    };
    imports.wbg.__wbg_stack_0ed75d68575b0f3c = function (arg0, arg1) {
        const ret = arg1.stack;
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    };
    imports.wbg.__wbg_static_accessor_GLOBAL_88a902d13a557d07 = function () {
        const ret = typeof global === 'undefined' ? null : global;
        return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    };
    imports.wbg.__wbg_static_accessor_GLOBAL_THIS_56578be7e9f832b0 = function () {
        const ret = typeof globalThis === 'undefined' ? null : globalThis;
        return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    };
    imports.wbg.__wbg_static_accessor_SELF_37c5d418e4bf5819 = function () {
        const ret = typeof self === 'undefined' ? null : self;
        return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    };
    imports.wbg.__wbg_static_accessor_WINDOW_5de37043a91a9c40 = function () {
        const ret = typeof window === 'undefined' ? null : window;
        return isLikeNone(ret) ? 0 : addToExternrefTable0(ret);
    };
    imports.wbg.__wbg_status_f6360336ca686bf0 = function (arg0) {
        const ret = arg0.status;
        return ret;
    };
    imports.wbg.__wbg_stringify_f7ed6987935b4a24 = function () {
        return handleError(function (arg0) {
            const ret = JSON.stringify(arg0);
            return ret;
        }, arguments);
    };
    imports.wbg.__wbg_text_7805bea50de2af49 = function () {
        return handleError(function (arg0) {
            const ret = arg0.text();
            return ret;
        }, arguments);
    };
    imports.wbg.__wbg_then_44b73946d2fb3e7d = function (arg0, arg1) {
        const ret = arg0.then(arg1);
        return ret;
    };
    imports.wbg.__wbg_then_48b406749878a531 = function (arg0, arg1, arg2) {
        const ret = arg0.then(arg1, arg2);
        return ret;
    };
    imports.wbg.__wbg_url_ae10c34ca209681d = function (arg0, arg1) {
        const ret = arg1.url;
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    };
    imports.wbg.__wbg_value_cd1ffa7b1ab794f1 = function (arg0) {
        const ret = arg0.value;
        return ret;
    };
    imports.wbg.__wbindgen_as_number = function (arg0) {
        const ret = +arg0;
        return ret;
    };
    imports.wbg.__wbindgen_bigint_from_i64 = function (arg0) {
        const ret = arg0;
        return ret;
    };
    imports.wbg.__wbindgen_bigint_from_u64 = function (arg0) {
        const ret = BigInt.asUintN(64, arg0);
        return ret;
    };
    imports.wbg.__wbindgen_bigint_get_as_i64 = function (arg0, arg1) {
        const v = arg1;
        const ret = typeof (v) === 'bigint' ? v : undefined;
        getDataViewMemory0().setBigInt64(arg0 + 8 * 1, isLikeNone(ret) ? BigInt(0) : ret, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret), true);
    };
    imports.wbg.__wbindgen_boolean_get = function (arg0) {
        const v = arg0;
        const ret = typeof (v) === 'boolean' ? (v ? 1 : 0) : 2;
        return ret;
    };
    imports.wbg.__wbindgen_cb_drop = function (arg0) {
        const obj = arg0.original;
        if (obj.cnt-- == 1) {
            obj.a = 0;
            return true;
        }
        const ret = false;
        return ret;
    };
    imports.wbg.__wbindgen_closure_wrapper7888 = function (arg0, arg1, arg2) {
        const ret = makeMutClosure(arg0, arg1, 285, __wbg_adapter_52);
        return ret;
    };
    imports.wbg.__wbindgen_closure_wrapper7947 = function (arg0, arg1, arg2) {
        const ret = makeMutClosure(arg0, arg1, 285, __wbg_adapter_55);
        return ret;
    };
    imports.wbg.__wbindgen_closure_wrapper7994 = function (arg0, arg1, arg2) {
        const ret = makeMutClosure(arg0, arg1, 285, __wbg_adapter_55);
        return ret;
    };
    imports.wbg.__wbindgen_closure_wrapper8321 = function (arg0, arg1, arg2) {
        const ret = makeMutClosure(arg0, arg1, 285, __wbg_adapter_55);
        return ret;
    };
    imports.wbg.__wbindgen_debug_string = function (arg0, arg1) {
        const ret = debugString(arg1);
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    };
    imports.wbg.__wbindgen_error_new = function (arg0, arg1) {
        const ret = new Error(getStringFromWasm0(arg0, arg1));
        return ret;
    };
    imports.wbg.__wbindgen_in = function (arg0, arg1) {
        const ret = arg0 in arg1;
        return ret;
    };
    imports.wbg.__wbindgen_init_externref_table = function () {
        const table = wasm.__wbindgen_export_4;
        const offset = table.grow(4);
        table.set(0, undefined);
        table.set(offset + 0, undefined);
        table.set(offset + 1, null);
        table.set(offset + 2, true);
        table.set(offset + 3, false);
        ;
    };
    imports.wbg.__wbindgen_is_bigint = function (arg0) {
        const ret = typeof (arg0) === 'bigint';
        return ret;
    };
    imports.wbg.__wbindgen_is_function = function (arg0) {
        const ret = typeof (arg0) === 'function';
        return ret;
    };
    imports.wbg.__wbindgen_is_object = function (arg0) {
        const val = arg0;
        const ret = typeof (val) === 'object' && val !== null;
        return ret;
    };
    imports.wbg.__wbindgen_is_string = function (arg0) {
        const ret = typeof (arg0) === 'string';
        return ret;
    };
    imports.wbg.__wbindgen_is_undefined = function (arg0) {
        const ret = arg0 === undefined;
        return ret;
    };
    imports.wbg.__wbindgen_jsval_eq = function (arg0, arg1) {
        const ret = arg0 === arg1;
        return ret;
    };
    imports.wbg.__wbindgen_jsval_loose_eq = function (arg0, arg1) {
        const ret = arg0 == arg1;
        return ret;
    };
    imports.wbg.__wbindgen_memory = function () {
        const ret = wasm.memory;
        return ret;
    };
    imports.wbg.__wbindgen_number_get = function (arg0, arg1) {
        const obj = arg1;
        const ret = typeof (obj) === 'number' ? obj : undefined;
        getDataViewMemory0().setFloat64(arg0 + 8 * 1, isLikeNone(ret) ? 0 : ret, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret), true);
    };
    imports.wbg.__wbindgen_number_new = function (arg0) {
        const ret = arg0;
        return ret;
    };
    imports.wbg.__wbindgen_string_get = function (arg0, arg1) {
        const obj = arg1;
        const ret = typeof (obj) === 'string' ? obj : undefined;
        var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    };
    imports.wbg.__wbindgen_string_new = function (arg0, arg1) {
        const ret = getStringFromWasm0(arg0, arg1);
        return ret;
    };
    imports.wbg.__wbindgen_throw = function (arg0, arg1) {
        throw new Error(getStringFromWasm0(arg0, arg1));
    };
    return imports;
}
function __wbg_init_memory(imports, memory) {
}
function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    __wbg_init.__wbindgen_wasm_module = module;
    cachedDataViewMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    wasm.__wbindgen_start();
    return wasm;
}
function initSync(module) {
    if (wasm !== undefined)
        return wasm;
    if (typeof module !== 'undefined') {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({ module } = module);
        }
        else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead');
        }
    }
    const imports = __wbg_get_imports();
    __wbg_init_memory(imports);
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}
async function __wbg_init(module_or_path) {
    if (wasm !== undefined)
        return wasm;
    module_or_path = '/helios_bg.wasm';
    const imports = __wbg_get_imports();
    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }
    __wbg_init_memory(imports);
    const { instance, module } = await __wbg_load(await module_or_path, imports);
    return __wbg_finalize_init(instance, module);
}
export { initSync };
export default __wbg_init;
