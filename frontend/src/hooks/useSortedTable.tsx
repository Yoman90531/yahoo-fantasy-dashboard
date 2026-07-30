import { useMemo, useState } from 'react'

interface SortState<K extends string> {
  key: K
  dir: 1 | -1
}

export function useSortedTable<T, K extends string>(
  data: T[] | null | undefined,
  defaultKey: K,
  defaultDir: 1 | -1 = -1,
) {
  const [sort, setSort] = useState<SortState<K>>({ key: defaultKey, dir: defaultDir })

  const toggle = (key: K) =>
    setSort(current =>
      current.key === key
        ? { key, dir: (current.dir * -1) as 1 | -1 }
        : { key, dir: key === ('manager_name' as K) ? 1 : -1 },
    )

  const sorted = useMemo(() => {
    if (!data) return []
    return [...data].sort((a, b) => {
      const aValue = (a as Record<string, unknown>)[sort.key]
      const bValue = (b as Record<string, unknown>)[sort.key]
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return aValue.localeCompare(bValue) * sort.dir
      }
      return (((aValue as number) ?? 0) - ((bValue as number) ?? 0)) * sort.dir
    })
  }, [data, sort.key, sort.dir])

  const th = (label: string, key: K, align: 'left' | 'right' = 'right') => (
    <th
      className={`px-4 py-3 cursor-pointer hover:text-white select-none ${
        align === 'left' ? 'text-left' : 'text-right'
      }`}
      onClick={() => toggle(key)}
    >
      {label} {sort.key === key ? (sort.dir === -1 ? '↓' : '↑') : ''}
    </th>
  )

  return { sorted, sort, toggle, th }
}
