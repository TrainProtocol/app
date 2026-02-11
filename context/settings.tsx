import React, { Context, FC } from 'react'
import { TrainAppSettings } from '../Models/TrainAppSettings';

export const SettingsStateContext = React.createContext<TrainAppSettings | null>(null);

export const SettingsProvider: FC<{ data: TrainAppSettings, children?: React.ReactNode }> = ({ children, data }) => {
  return (
    <SettingsStateContext.Provider value={data}>
      {children}
    </SettingsStateContext.Provider>
  );
}

export function useSettingsState() {
  const data = React.useContext<TrainAppSettings>(SettingsStateContext as Context<TrainAppSettings>);

  if (data === undefined) {
    throw new Error('useSettingsState must be used within a SettingsProvider');
  }

  return data;
}
