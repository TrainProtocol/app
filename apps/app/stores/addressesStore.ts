import { createWithEqualityFn as create } from 'zustand/traditional'
import { AddressGroup, AddressItem } from '../components/Input/Address/AddressPicker';

interface AddressesState {
    addresses: AddressItem[];
    setAddresses: (addresses: AddressItem[]) => void;
    addAddress: (address: string) => void;
}

export const useAddressesStore = create<AddressesState>()((set) => ({
    addresses: [],
    setAddresses: (addresses) => set(() => {
        return ({
            addresses: addresses
        })
    }),
    addAddress: (address) => set((state) => ({
        addresses: [...state.addresses, { address, group: AddressGroup.ManualAdded, date: new Date().toISOString() }]
    })),
}))