import { ExtendedNetwork, ExtendedToken } from "../../Models/Network";

export type SwapFormValues = {
  amount?: string;
  destination_address?: string;
  fromCurrency?: ExtendedToken;
  toCurrency?: ExtendedToken;
  refuel?: boolean;
  from?: ExtendedNetwork;
  to?: ExtendedNetwork;
}


export type SwapDirection = "from" | "to";