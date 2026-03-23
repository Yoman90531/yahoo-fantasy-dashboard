import { useState, useMemo } from 'react'

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
    setSort(s => s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: key === 'manager_name' as K ? 1 : -1 })

  const sorted = useMemo(() => {
    if (!data) return []
    return [...data].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sort.key]
      const bVal = (b as Record<string, unknown>)[sort.key]
      if (typeof aVal === 'string' && typeof bVal === 'string') return aVal.localeCompare(bVal) * sort.dir
      return (((aVal as number) ?? 0) - ((bVal as number) ?? 0)) * sort.dir
    })
  }, [data, sort.key, sort.dir])

  const th = (label: string, key: K, align: 'left' | 'right' = 'right') => (
    <th
      className={`px-4 py-3 text-${align} cursor-pointer hover:text-white select-none`}
      onClick={() => toggle(key)}
    >
      {label} {sort.key === key ? (sort.dir === -1 ? '↓' : '↑') : ''}
    </th>
  )

  return { sorted, sort, toggle, th }
}
