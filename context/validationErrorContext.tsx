import React, { createContext } from 'react';
import { ReactNode } from 'react';
import { Info, RouteOff } from 'lucide-react';
import { SwapFormValues } from '../components/DTOs/SwapFormValues';
import { useFormikContext } from 'formik';
import { useQueryState } from './query';
import { useSettingsState } from './settings';

interface ValidationDetails {
    title?: string;
    type?: string;
    icon?: React.ReactNode;
}

interface ValidationContextType {
    validationMessage: string;
    validationDetails: ValidationDetails;
}

const defaultContextValue: ValidationContextType = {
    validationMessage: '',
    validationDetails: {},
};

const ValidationContext = createContext<ValidationContextType>(defaultContextValue);

export const ValidationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {

    const {
        values,
    } = useFormikContext<SwapFormValues>();
    const { destinationRoutes: allDestinations, sourceRoutes: allSources } = useSettingsState()

    const { to, from, fromCurrency, toCurrency } = values;
    const query = useQueryState();
    const fromDisplayName = from?.displayName;
    const toDisplayName = to?.displayName;

    let validationMessage = '';
    let validationDetails: ValidationDetails = {};

    if (query?.lockToAsset) {
        // if (fromCurrency?.status === 'not_found') {
        //     validationMessage = `Transfers from ${fromDisplayName} ${fromCurrency?.symbol} to this token are not supported`;
        //     validationDetails = { title: 'Route Unavailable', type: 'warning', icon: <RouteOff stroke='#f8974b' className='w-4 h-4 ' /> };
        // }
        // else if (fromCurrency?.status === 'inactive') {
        //     validationMessage = `Sorry, transfers of ${fromCurrency?.symbol} from ${fromDisplayName} are not available at the moment. Please try later.`;
        //     validationDetails = { title: 'Temporarily unavailable.', type: 'warning', icon: <Info stroke='#f8974b' className='w-4 h-4 ' /> };
        // }
        // else 
        if (!toCurrency) {
            validationMessage = `Sorry, transfers of ${query?.toAsset} to ${toDisplayName || query.to} are not available at the moment. Please try later.`;
            validationDetails = { title: 'Temporarily unavailable.', type: 'warning', icon: <Info stroke='#f8974b' className='w-4 h-4 ' /> };
        }
    }
    else if (query?.lockFromAsset) {
        // if (toCurrency?.status === 'not_found') {
        //     validationMessage = `Transfers to ${toDisplayName} ${toCurrency?.symbol} from this token are not supported`;
        //     validationDetails = { title: 'Route Unavailable', type: 'warning', icon: <RouteOff stroke='#f8974b' className='w-4 h-4 ' /> };
        // }
        // else if (toCurrency?.status === 'inactive') {
        //     validationMessage = `Sorry, transfers of ${toCurrency?.symbol} to ${toDisplayName} are not available at the moment. Please try later.`;
        //     validationDetails = { title: 'Temporarily unavailable.', type: 'warning', icon: <Info stroke='#f8974b' className='w-4 h-4 ' /> };
        // }
        // else
         if (!fromCurrency) {
            validationMessage = `Sorry, transfers of ${query?.fromAsset} from ${fromDisplayName || query.from} are not available at the moment. Please try later.`;
            validationDetails = { title: 'Temporarily unavailable.', type: 'warning', icon: <Info stroke='#f8974b' className='w-4 h-4 ' /> };
        }
    }
    // else if (toCurrency?.status === 'inactive' || fromCurrency?.status === 'inactive') {
    //     const unfilteredDestinationRoute = allDestinations?.find(r => r.name === to?.name)
    //     const unfilteredDestinationCurrency = unfilteredDestinationRoute?.tokens?.find(t => t.symbol === toCurrency?.symbol)
    //     const unfilteredSourceRoute = allSources?.find(r => r.name === from?.name)
    //     const unfilteredSourceCurrency = unfilteredSourceRoute?.tokens?.find(t => t.symbol === fromCurrency?.symbol)

    //     if (unfilteredDestinationCurrency?.status === 'inactive') {
    //         validationMessage = `Sorry, transfers of ${toCurrency?.symbol} to ${toDisplayName} are not available at the moment. Please try later.`;
    //         validationDetails = { title: 'Temporarily unavailable.', type: 'warning', icon: <Info stroke='#f8974b' className='w-4 h-4 ' /> };
    //     }
    //     else if (unfilteredSourceCurrency?.status === 'inactive') {
    //         validationMessage = `Sorry, transfers of ${fromCurrency?.symbol} from ${fromDisplayName} are not available at the moment. Please try later.`;
    //         validationDetails = { title: 'Temporarily unavailable.', type: 'warning', icon: <Info stroke='#f8974b' className='w-4 h-4 ' /> };
    //     }
    //     else {
    //         validationMessage = `Please change one of the selected tokens or try later.`;
    //         validationDetails = { title: 'Temporarily unavailable.', type: 'warning', icon: <Info stroke='#f8974b' className='w-4 h-4 ' /> };
    //     }
    // }
    // else if (toCurrency?.status === 'not_found' || fromCurrency?.status === 'not_found') {

    //     validationMessage = 'Please change one of the selected tokens';
    //     validationDetails = { title: 'Route Unavailable', type: 'warning', icon: <RouteOff stroke='#f8974b' className='w-4 h-4 ' /> };
    // }

    return (
        <ValidationContext.Provider
            value={{ validationMessage, validationDetails }}
        >
            {children}
        </ValidationContext.Provider>
    );
};

export const useValidationContext = () => React.useContext(ValidationContext);