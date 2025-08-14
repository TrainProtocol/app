
export class QueryParams {
    from?: string = "";
    to?: string = "";
    lockFrom?: boolean = false;
    lockTo?: boolean = false;

    lockFromAsset?: boolean = false;
    lockToAsset?: boolean = false;

    fromAsset?: string = "";
    toAsset?: string = "";
    destAddress?: string = "";
    hideAddress?: boolean = false;
    hideFrom?: boolean = false;
    hideTo?: boolean = false;
    transferAmount?: string = "";
    balances?: string = "";
    account?: string = "";
    actionButtonText?: string = "";
    theme?: string = "";
    appName?: string = "";
    hideLogo?: boolean = false

    // Obsolate
    destNetwork?: string = "";
    lockNetwork?: boolean = false;
    addressSource?: string = "";
    asset?: string = "";
    lockAsset?: boolean = false;

}