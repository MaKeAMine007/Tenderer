interface ErrorStateProps {
  message?: string
  onRetry: () => void
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <tr>
      <td colSpan={10}>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-sm font-medium text-zinc-700">Unable to load tenders</p>
          <p className="text-xs text-zinc-400 mt-1 mb-4">
            {message ?? 'An unexpected error occurred. Please try again.'}
          </p>
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-white text-zinc-700 rounded border border-zinc-200 hover:bg-zinc-50 transition-colors"
          >
            Retry
          </button>
        </div>
      </td>
    </tr>
  )
}
