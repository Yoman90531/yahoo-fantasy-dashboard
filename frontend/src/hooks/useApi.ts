import { useQuery } from '@tanstack/react-query'

export function useApi<T>(
  queryKey: readonly unknown[],
  fetcher: () => Promise<T>,
  enabled = true,
) {
  const query = useQuery<T, Error>({
    queryKey,
    queryFn: fetcher,
    enabled,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  return {
    data: query.data ?? null,
    loading: query.isPending,
    error: query.error?.message ?? null,
  }
}
