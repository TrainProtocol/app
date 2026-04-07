import { create } from 'zustand'
import { AddressGroup, AddressItem } from '../components/Input/Address/AddressPicker';

interface AddressesState {
    addresses: AddressItem[];
    addAddress: (address: string) => void;
}

export const useAddressesStore = create<AddressesState>()((set, get) => ({
    addresses: [],
    addAddress: (address: string) => {
        const existing = get().addresses.find(a => a.address.toLowerCase() === address.toLowerCase());
        if (existing) return;
        set((state) => ({
            addresses: [...state.addresses, { address, group: AddressGroup.ManualAdded }]
        }));
    },
}))