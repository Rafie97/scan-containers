import React, { createContext, useContext, useReducer, Dispatch, ReactNode } from 'react';
import { appReducer, initialState } from './reducer';
import { AppState, AppAction } from './types';

const StateContext = createContext<AppState>(initialState);
const DispatchContext = createContext<Dispatch<AppAction>>(() => {});

export function useStore(): AppState {
  return useContext(StateContext);
}

export function useDispatch(): Dispatch<AppAction> {
  return useContext(DispatchContext);
}

interface StoreProviderProps {
  children: ReactNode;
}

export function StoreProvider({ children }: StoreProviderProps) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>
        {children}
      </DispatchContext.Provider>
    </StateContext.Provider>
  );
}

// Re-export types and helpers
export * from './types';
export { calculateCartTotal } from './reducer';
