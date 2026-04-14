import { ExtendedNetwork, ExtendedToken } from "../../Models/Network";
import type { QuoteDirection } from "@train-protocol/react";

export type SwapFormValues = {
  amount?: string;
  receiveAmount?: string;
  quoteDirection?: QuoteDirection;
  destination_address?: string;
  fromCurrency?: ExtendedToken;
  toCurrency?: ExtendedToken;
  refuel?: boolean;
  from?: ExtendedNetwork;
  to?: ExtendedNetwork;
}


export type SwapDirection = "from" | "to";