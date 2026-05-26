export type ApiError = {
    code: LSAPIKnownErrorCode | string,
    message: string;
    metadata: {
        AvailableTransactionAmount: number
        RemainingLimitPeriod: string
        ActivationUrl: string
    }
}

export enum LSAPIKnownErrorCode {
    ROUTE_NOT_FOUND_ERROR = "ROUTE_NOT_FOUND_ERROR"
}