import { QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';

import ErrorBoundary from '~/components/ErrorBoundary';
import StateProvider from '~/components/StateProvider';
import { queryClient } from '~/misc/query';
import { actions, initialState } from '~/store';

type Props = {
  children: React.ReactNode;
};

export function AppProviders({ children }: Props) {
  return (
    <ErrorBoundary>
      <StateProvider initialState={initialState} actions={actions}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </StateProvider>
    </ErrorBoundary>
  );
}
