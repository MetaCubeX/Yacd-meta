import { QueryCache, QueryClient } from '@tanstack/react-query';

const queryCache = new QueryCache();
// NOTE: the global `suspense: true` default was removed in @tanstack/react-query v5.
// Components that rely on suspense now use `useSuspenseQuery` directly.
export const queryClient = new QueryClient({
  queryCache,
});
