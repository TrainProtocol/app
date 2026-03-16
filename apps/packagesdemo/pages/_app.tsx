import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { registerEvmSdk } from '@train-protocol/evm'

if (typeof window !== 'undefined') {
  registerEvmSdk()
}

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />
}
