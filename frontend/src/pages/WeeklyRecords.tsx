import PageWrapper from '../components/layout/PageWrapper'
import LoadingSpinner from '../components/cards/LoadingSpinner'
import ErrorMessage from '../components/cards/ErrorMessage'
import { useApi } from '../hooks/useApi'
import { statsApi } from '../api/client'
import type { WeeklyRecords as WR, WeeklyRecordEntry } from '../types'

function RecordTable({ entries, columns }: { entries: WeeklyRecordEntry[]; columns: { label: string; render: (e: WeeklyRecordEntry) => React.ReactNode }[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-900 text-gray-400 text-xs uppercase tracking-wider">
            <th className="px-4 py-3 text-left">#</th>
            <th className="px-4 py-3 text-left">Manager</th>
            <th className="px-4 py-3 text-left">Season / Week</th>
            {columns.map(c => (
              <th key={c.label} className="px-4 py-3 text-right">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => (
            <tr key={i} className="border-t border-gray-800 hover:bg-gray-800 transition-colors">
              <td className="px-4 py-3 text-gray-500">{i + 1}</td>
              <td className="px-4 py-3 font-medium text-white">{e.manager_name}</td>
              <td className="px-4 py-3 text-gray-400">{e.year} · Wk {e.week}</td>
              {columns.map(c => (
                <td key={c.label} className="px-4 py-3 text-right">{c.render(e)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
    <div className="px-5 py-4 border-b border-gray-800">
      <h2 className="font-semibold text-white">{title}</h2>
    </div>
    <div className="p-4">{children}</div>
  </div>
)

export default function WeeklyRecords() {
  const { data, loading, error } = useApi<WR>(() => statsApi.weeklyRecords(), [])

  if (loading) return <PageWrapper title="Weekly Records"><LoadingSpinner /></PageWrapper>
  if (error) return <PageWrapper title="Weekly Records"><ErrorMessage message={error} /></PageWrapper>
  if (!data) return null

  return (
    <PageWrapper title="Weekly Records" subtitle="The best, worst, and most dramatic single-week performances in league history." dataScope="all">
      <div className="flex flex-col gap-6">
        <Section title="Highest Scores Ever">
          <RecordTable
            entries={data.highest_score}
            columns={[{ label: 'Score', render: e => <span className="font-bold text-green-400">{e.points.toFixed(2)}</span> }]}
          />
        </Section>

        <Section title="Lowest Winning Score (Barely Survived)">
          <RecordTable
            entries={data.lowest_winning_score}
            columns={[
              { label: 'Score', render: e => <span className="font-bold text-yellow-400">{e.points.toFixed(2)}</span> },
              { label: 'Opp Score', render: e => <span className="text-gray-400">{e.opponent_points?.toFixed(2)}</span> },
            ]}
          />
        </Section>

        <Section title="Highest Losing Score (Unlucky)">
          <RecordTable
            entries={data.highest_losing_score}
            columns={[
              { label: 'Score', render: e => <span className="font-bold text-red-400">{e.points.toFixed(2)}</span> },
              { label: 'Opp Score', render: e => <span className="text-gray-400">{e.opponent_points?.toFixed(2)}</span> },
            ]}
          />
        </Section>

        <div className="grid md:grid-cols-2 gap-6">
          <Section title="Biggest Blowouts">
            <RecordTable
              entries={data.biggest_blowout}
              columns={[
                { label: 'Score', render: e => <span className="text-green-400">{e.points.toFixed(2)}</span> },
                { label: 'Margin', render: e => <span className="font-bold text-brand-400">+{(e.margin ?? 0).toFixed(2)}</span> },
              ]}
            />
          </Section>
          <Section title="Closest Games">
            <RecordTable
              entries={data.closest_games}
              columns={[
                { label: 'Score', render: e => <span className="text-green-400">{e.points.toFixed(2)}</span> },
                { label: 'Margin', render: e => <span className="font-bold text-amber-400">+{(e.margin ?? 0).toFixed(2)}</span> },
              ]}
            />
          </Section>
        </div>
      </div>
    </PageWrapper>
  )
}
