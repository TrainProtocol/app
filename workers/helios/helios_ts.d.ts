/* tslint:disable */
/* eslint-disable */
export class EthereumClient {
  free(): void;
  constructor(execution_rpc: string | null | undefined, execution_verifiable_api: string | null | undefined, consensus_rpc: string | null | undefined, network: string, checkpoint: string | null | undefined, db_type: string);
  sync(): Promise<void>;
  wait_synced(): Promise<void>;
  chain_id(): number;
  get_block_number(): Promise<number>;
  get_balance(addr: any, block: any): Promise<string>;
  get_transaction_by_hash(hash: string): Promise<any>;
  get_transaction_by_block_hash_and_index(hash: any, index: any): Promise<any>;
  get_transaction_by_block_number_and_index(block: any, index: any): Promise<any>;
  get_transaction_count(addr: any, block: any): Promise<number>;
  get_block_transaction_count_by_hash(hash: any): Promise<number | undefined>;
  get_block_transaction_count_by_number(block: any): Promise<number | undefined>;
  get_block_by_number(block: any, full_tx: boolean): Promise<any>;
  get_block_by_hash(hash: string, full_tx: boolean): Promise<any>;
  get_code(addr: any, block: any): Promise<string>;
  get_storage_at(address: any, slot: any, block: any): Promise<any>;
  get_proof(address: any, storage_keys: any, block: any): Promise<any>;
  call(opts: any, block: any): Promise<string>;
  estimate_gas(opts: any, block: any): Promise<number>;
  create_access_list(opts: any, block: any): Promise<any>;
  gas_price(): Promise<any>;
  max_priority_fee_per_gas(): Promise<any>;
  send_raw_transaction(tx: string): Promise<any>;
  get_transaction_receipt(tx: any): Promise<any>;
  get_block_receipts(block: any): Promise<any>;
  get_logs(filter: any): Promise<any>;
  get_filter_changes(filter_id: any): Promise<any>;
  get_filter_logs(filter_id: any): Promise<any>;
  uninstall_filter(filter_id: any): Promise<boolean>;
  new_filter(filter: any): Promise<any>;
  new_block_filter(): Promise<any>;
  new_pending_transaction_filter(): Promise<any>;
  client_version(): Promise<string>;
}
export class OpStackClient {
  free(): void;
  constructor(execution_rpc: string | null | undefined, execution_verifiable_api: string | null | undefined, network: string);
  sync(): Promise<void>;
  wait_synced(): Promise<void>;
  chain_id(): number;
  get_block_number(): Promise<number>;
  get_balance(addr: any, block: any): Promise<string>;
  get_transaction_by_hash(hash: string): Promise<any>;
  get_transaction_by_block_hash_and_index(hash: any, index: any): Promise<any>;
  get_transaction_by_block_number_and_index(block: any, index: any): Promise<any>;
  get_transaction_count(addr: any, block: any): Promise<number>;
  get_block_transaction_count_by_hash(hash: any): Promise<number | undefined>;
  get_block_transaction_count_by_number(block: any): Promise<number | undefined>;
  get_block_by_number(block: any, full_tx: boolean): Promise<any>;
  get_block_by_hash(hash: string, full_tx: boolean): Promise<any>;
  get_code(addr: any, block: any): Promise<string>;
  get_storage_at(address: any, slot: any, block: any): Promise<any>;
  get_proof(address: any, storage_keys: any, block: any): Promise<any>;
  call(opts: any, block: any): Promise<string>;
  estimate_gas(opts: any, block: any): Promise<number>;
  create_access_list(opts: any, block: any): Promise<any>;
  gas_price(): Promise<any>;
  max_priority_fee_per_gas(): Promise<any>;
  send_raw_transaction(tx: string): Promise<any>;
  get_transaction_receipt(tx: any): Promise<any>;
  get_block_receipts(block: any): Promise<any>;
  get_logs(filter: any): Promise<any>;
  get_filter_changes(filter_id: any): Promise<any>;
  get_filter_logs(filter_id: any): Promise<any>;
  uninstall_filter(filter_id: any): Promise<boolean>;
  new_filter(filter: any): Promise<any>;
  new_block_filter(): Promise<any>;
  new_pending_transaction_filter(): Promise<any>;
  client_version(): Promise<string>;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_ethereumclient_free: (a: number, b: number) => void;
  readonly ethereumclient_new: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number) => [number, number, number];
  readonly ethereumclient_sync: (a: number) => any;
  readonly ethereumclient_wait_synced: (a: number) => any;
  readonly ethereumclient_chain_id: (a: number) => number;
  readonly ethereumclient_get_block_number: (a: number) => any;
  readonly ethereumclient_get_balance: (a: number, b: any, c: any) => any;
  readonly ethereumclient_get_transaction_by_hash: (a: number, b: number, c: number) => any;
  readonly ethereumclient_get_transaction_by_block_hash_and_index: (a: number, b: any, c: any) => any;
  readonly ethereumclient_get_transaction_by_block_number_and_index: (a: number, b: any, c: any) => any;
  readonly ethereumclient_get_transaction_count: (a: number, b: any, c: any) => any;
  readonly ethereumclient_get_block_transaction_count_by_hash: (a: number, b: any) => any;
  readonly ethereumclient_get_block_transaction_count_by_number: (a: number, b: any) => any;
  readonly ethereumclient_get_block_by_number: (a: number, b: any, c: number) => any;
  readonly ethereumclient_get_block_by_hash: (a: number, b: number, c: number, d: number) => any;
  readonly ethereumclient_get_code: (a: number, b: any, c: any) => any;
  readonly ethereumclient_get_storage_at: (a: number, b: any, c: any, d: any) => any;
  readonly ethereumclient_get_proof: (a: number, b: any, c: any, d: any) => any;
  readonly ethereumclient_call: (a: number, b: any, c: any) => any;
  readonly ethereumclient_estimate_gas: (a: number, b: any, c: any) => any;
  readonly ethereumclient_create_access_list: (a: number, b: any, c: any) => any;
  readonly ethereumclient_gas_price: (a: number) => any;
  readonly ethereumclient_max_priority_fee_per_gas: (a: number) => any;
  readonly ethereumclient_send_raw_transaction: (a: number, b: number, c: number) => any;
  readonly ethereumclient_get_transaction_receipt: (a: number, b: any) => any;
  readonly ethereumclient_get_block_receipts: (a: number, b: any) => any;
  readonly ethereumclient_get_logs: (a: number, b: any) => any;
  readonly ethereumclient_get_filter_changes: (a: number, b: any) => any;
  readonly ethereumclient_get_filter_logs: (a: number, b: any) => any;
  readonly ethereumclient_uninstall_filter: (a: number, b: any) => any;
  readonly ethereumclient_new_filter: (a: number, b: any) => any;
  readonly ethereumclient_new_block_filter: (a: number) => any;
  readonly ethereumclient_new_pending_transaction_filter: (a: number) => any;
  readonly ethereumclient_client_version: (a: number) => any;
  readonly __wbg_opstackclient_free: (a: number, b: number) => void;
  readonly opstackclient_new: (a: number, b: number, c: number, d: number, e: number, f: number) => [number, number, number];
  readonly opstackclient_sync: (a: number) => any;
  readonly opstackclient_wait_synced: (a: number) => any;
  readonly opstackclient_chain_id: (a: number) => number;
  readonly opstackclient_get_block_number: (a: number) => any;
  readonly opstackclient_get_balance: (a: number, b: any, c: any) => any;
  readonly opstackclient_get_transaction_by_hash: (a: number, b: number, c: number) => any;
  readonly opstackclient_get_transaction_by_block_hash_and_index: (a: number, b: any, c: any) => any;
  readonly opstackclient_get_transaction_by_block_number_and_index: (a: number, b: any, c: any) => any;
  readonly opstackclient_get_transaction_count: (a: number, b: any, c: any) => any;
  readonly opstackclient_get_block_transaction_count_by_hash: (a: number, b: any) => any;
  readonly opstackclient_get_block_transaction_count_by_number: (a: number, b: any) => any;
  readonly opstackclient_get_block_by_number: (a: number, b: any, c: number) => any;
  readonly opstackclient_get_block_by_hash: (a: number, b: number, c: number, d: number) => any;
  readonly opstackclient_get_code: (a: number, b: any, c: any) => any;
  readonly opstackclient_get_storage_at: (a: number, b: any, c: any, d: any) => any;
  readonly opstackclient_get_proof: (a: number, b: any, c: any, d: any) => any;
  readonly opstackclient_call: (a: number, b: any, c: any) => any;
  readonly opstackclient_estimate_gas: (a: number, b: any, c: any) => any;
  readonly opstackclient_create_access_list: (a: number, b: any, c: any) => any;
  readonly opstackclient_gas_price: (a: number) => any;
  readonly opstackclient_max_priority_fee_per_gas: (a: number) => any;
  readonly opstackclient_send_raw_transaction: (a: number, b: number, c: number) => any;
  readonly opstackclient_get_transaction_receipt: (a: number, b: any) => any;
  readonly opstackclient_get_block_receipts: (a: number, b: any) => any;
  readonly opstackclient_get_logs: (a: number, b: any) => any;
  readonly opstackclient_get_filter_changes: (a: number, b: any) => any;
  readonly opstackclient_get_filter_logs: (a: number, b: any) => any;
  readonly opstackclient_uninstall_filter: (a: number, b: any) => any;
  readonly opstackclient_new_filter: (a: number, b: any) => any;
  readonly opstackclient_new_block_filter: (a: number) => any;
  readonly opstackclient_new_pending_transaction_filter: (a: number) => any;
  readonly opstackclient_client_version: (a: number) => any;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_exn_store: (a: number) => void;
  readonly __externref_table_alloc: () => number;
  readonly __wbindgen_export_4: WebAssembly.Table;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_export_6: WebAssembly.Table;
  readonly __externref_table_dealloc: (a: number) => void;
  readonly closure284_externref_shim: (a: number, b: number, c: any) => void;
  readonly _dyn_core__ops__function__FnMut_____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__h1a810c12566889eb: (a: number, b: number) => void;
  readonly closure224_externref_shim: (a: number, b: number, c: any, d: any) => void;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
