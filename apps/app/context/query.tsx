"use client"

import React, { Context, FC, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { QueryParams } from '../Models/QueryParams';

export const QueryStateContext = React.createContext<QueryParams | null>(null);

const QueryProvider: FC<{ children?: React.ReactNode }> = ({ children }) => {
  const searchParams = useSearchParams()

  const value = useMemo<QueryParams>(() => {
    const isTrue = (k: string) => searchParams?.get(k) === 'true'
    const raw: QueryParams = {
      ...Object.fromEntries(searchParams?.entries() ?? []),
      lockNetwork: isTrue('lockNetwork'),
      hideAddress: isTrue('hideAddress'),
      hideFrom: isTrue('hideFrom'),
      hideTo: isTrue('hideTo'),
      lockFrom: isTrue('lockFrom'),
      lockTo: isTrue('lockTo'),
      lockAsset: isTrue('lockAsset'),
      lockFromAsset: isTrue('lockFromAsset'),
      lockToAsset: isTrue('lockToAsset'),
      hideLogo: isTrue('hideLogo'),
    }
    return mapLegacyQueryParams(raw)
  }, [searchParams])

  return (
    <QueryStateContext.Provider value={value}>
      {children}
    </QueryStateContext.Provider>
  );
}

function mapLegacyQueryParams(params: QueryParams): QueryParams {
  return {
    ...params,
    ...(params.destNetwork ? { to: params.destNetwork } : {}),
    ...(params.lockNetwork ? { lockTo: params.lockNetwork } : {}),
    ...(params.addressSource ? { appName: params.addressSource } : {}),
    ...(params.asset ? { [params.to ? "toAsset" : "fromAsset"]: params.asset } : {}),
    ...(params.lockAsset ? { [params.to ? "lockToAsset" : "lockFromAsset"]: params.lockAsset } : {}),
  }
}

export function useQueryState() {
  const data = React.useContext<QueryParams>(QueryStateContext as Context<QueryParams>);

  if (data === undefined) {
    throw new Error('useQueryState must be used within a QueryStateProvider');
  }

  return data;
}

export default QueryProvider;
