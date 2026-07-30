import { type FormEvent, useEffect, useState } from 'react'
import { MessageSquare, Send } from 'lucide-react'

import ErrorMessage from '../components/cards/ErrorMessage'
import LoadingSpinner from '../components/cards/LoadingSpinner'
import PageWrapper from '../components/layout/PageWrapper'
import { feedbackApi } from '../api/client'
import { useApi } from '../hooks/useApi'
import type { FeedbackPost } from '../types'

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

export default function FeedbackWall() {
  const { data, loading, error } = useApi<FeedbackPost[]>(() => feedbackApi.list(), [])
  const [posts, setPosts] = useState<FeedbackPost[]>([])
  const [authorName, setAuthorName] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (data) setPosts(data)
  }, [data])

  const submitFeedback = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedName = authorName.trim()
    const trimmedMessage = message.trim()

    if (!trimmedName || !trimmedMessage) {
      setSubmitError('Add your name and feedback before posting.')
      return
    }

    setSubmitting(true)
    setSubmitError(null)
    try {
      const created = await feedbackApi.create({
        author_name: trimmedName,
        message: trimmedMessage,
      }) as FeedbackPost
      setPosts(current => [created, ...current])
      setMessage('')
    } catch (requestError) {
      const fallback = 'Could not post feedback. Please try again.'
      setSubmitError(requestError instanceof Error ? requestError.message : fallback)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageWrapper
      title="Feedback Wall"
      subtitle="Ideas, fixes, and feature requests from the league."
    >
      <form
        onSubmit={submitFeedback}
        className="mb-8 border border-gray-800 rounded-lg bg-gray-900 p-4 sm:p-5"
      >
        <div className="grid gap-4">
          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-gray-200">Name</span>
            <input
              type="text"
              value={authorName}
              onChange={event => setAuthorName(event.target.value)}
              maxLength={80}
              autoComplete="name"
              className="h-10 w-full rounded-md border border-gray-700 bg-gray-950 px-3 text-sm text-white outline-none transition-colors placeholder:text-gray-600 focus:border-brand-500"
              placeholder="Your name"
            />
          </label>

          <label className="grid gap-1.5">
            <span className="text-sm font-medium text-gray-200">Feedback or feature request</span>
            <textarea
              value={message}
              onChange={event => setMessage(event.target.value)}
              maxLength={1000}
              rows={4}
              className="w-full resize-y rounded-md border border-gray-700 bg-gray-950 px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-gray-600 focus:border-brand-500"
              placeholder="What should we add or improve?"
            />
          </label>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div aria-live="polite" className="min-h-5 text-sm text-red-400">
              {submitError}
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send size={16} aria-hidden="true" />
              {submitting ? 'Posting...' : 'Post feedback'}
            </button>
          </div>
        </div>
      </form>

      <div className="mb-4 flex items-center gap-2">
        <MessageSquare size={18} className="text-brand-400" aria-hidden="true" />
        <h3 className="text-lg font-semibold text-white">League comments</h3>
        {!loading && <span className="text-sm text-gray-500">({posts.length})</span>}
      </div>

      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} />}

      {!loading && !error && posts.length === 0 && (
        <div className="border-y border-gray-800 py-10 text-center text-sm text-gray-500">
          No feedback yet.
        </div>
      )}

      {!loading && posts.length > 0 && (
        <div className="divide-y divide-gray-800 border-y border-gray-800">
          {posts.map(post => (
            <article key={post.id} className="flex gap-3 py-5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-950 text-sm font-bold uppercase text-brand-300">
                {post.author_name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <h4 className="font-semibold text-white">{post.author_name}</h4>
                  <time className="text-xs text-gray-500" dateTime={post.created_at}>
                    {dateFormatter.format(new Date(post.created_at))}
                  </time>
                </div>
                <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-6 text-gray-300">
                  {post.message}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </PageWrapper>
  )
}
