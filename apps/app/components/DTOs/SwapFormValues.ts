import { Network, Token } from "../../Models/Network";

export type SwapFormValues = {
  amount?: string;
  destination_address?: string;
  fromCurrency?: Token;
  toCurrency?: Token;
  refuel?: boolean;
  from?: Network;
  to?: Network;
}


export type SwapDirection = "from" | "to";