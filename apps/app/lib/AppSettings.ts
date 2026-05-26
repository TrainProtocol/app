export default class AppSettings {
    static TrainApiUri?: string = process.env.NEXT_PUBLIC_TRAIN_API
    static ApiVersion?: string = process.env.NEXT_PUBLIC_API_VERSION
    static WalletConnectProjectId: string = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || 'de509829918732a70d40f9dda9ff5dd7'
}