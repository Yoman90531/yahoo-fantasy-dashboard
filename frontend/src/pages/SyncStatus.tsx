import { useState } from 'react'
import PageWrapper from '../components/layout/PageWrapper'
import LoadingSpinner from '../components/cards/LoadingSpinner'
import ErrorMessage from '../components/cards/ErrorMessage'
import { useApi } from '../hooks/useApi'
import { syncApi } from '../api/client'
import type { SyncStatusRow } from '../types'

export default function SyncStatus() {
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)
  const { data: status, loading, error, } = useApi<SyncStatusRow[]>(() => syncApi.status(), [syncMsg])
  const { data: log } = useApi(() => syncApi.log(), [syncMsg])

  async function handleSync() {
    setSyncing(true)
    setSyncMsg(null)
    try {
      const res = await syncApi.run()
      setSyncMsg(res.message)
    } catch (e: unknown) {
      setSyncMsg(`Error: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setSyncing(false)
    }
  }

  return (
    <PageWrapper title="Sync Data" subtitle="Pull the latest data from Yahoo Fantasy Sports.">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={handleSync}
          disabled={syncing}
          className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {syncing ? 'Syncing...' : 'Sync Now'}
        </button>
        {syncMsg && <span className="text-sm text-gray-400">{syncMsg}</span>}
      </div>

      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} />}

      {status && (
        <div className="overflow-x-auto rounded-xl border border-gray-800 mb-8">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-900 text-gray-400 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Season</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Last Synced</th>
                <th className="px-4 py-3 text-left">Error</th>
              </tr>
            </thead>
            <tbody>
              {status.map(r => (
                <tr key={r.season_year} className="border-t border-gray-800">
                  <td className="px-4 py-3 font-medium">{r.season_year}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                      r.status === 'success' ? 'bg-green-950 text-green-400 border border-green-800' :
                      r.status === 'error' ? 'bg-red-950 text-red-400 border border-red-800' :
                      'bg-yellow-950 text-yellow-400 border border-yellow-800'
                    }`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{r.synced_at ? new Date(r.synced_at).toLocaleString() : '—'}</td>
                  <td className="px-4 py-3 text-red-400 text-xs truncate max-w-xs">{r.error_msg ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Recent log */}
      {log && log.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-3">Recent Log</h2>
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-900 text-gray-400 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 text-left">Season</th>
                  <th className="px-4 py-3 text-left">Week</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Time</th>
                  <th className="px-4 py-3 text-left">Error</th>
                </tr>
              </thead>
              <tbody>
                {log.slice(0, 30).map((r: { id: number; season_year: number; week: number | null; status: string; synced_at: string | null; error_msg: string | null }) => (
                  <tr key={r.id} className="border-t border-gray-800 text-xs">
                    <td className="px-4 py-2">{r.season_year}</td>
                    <td className="px-4 py-2 text-gray-400">{r.week ?? 'All'}</td>
                    <td className="px-4 py-2">
                      <span className={r.status === 'success' ? 'text-green-400' : r.status === 'error' ? 'text-red-400' : 'text-yellow-400'}>{r.status}</span>
                    </td>
                    <td className="px-4 py-2 text-gray-500">{r.synced_at ? new Date(r.synced_at).toLocaleString() : '—'}</td>
                    <td className="px-4 py-2 text-red-400 truncate max-w-xs">{r.error_msg ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PageWrapper>
  )
}
