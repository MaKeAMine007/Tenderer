interface PaginationProps {
  page: number
  totalPages: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, totalPages, totalItems, pageSize, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null

  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, totalItems)

  const pages = getPageNumbers(page, totalPages)

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-100">
      <span className="text-xs text-zinc-400 tabular-nums">
        {start}–{end} of {totalItems.toLocaleString()} tenders
      </span>
      <div className="flex items-center gap-1">
        <PageButton
          label="←"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
        />
        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`ellipsis-${i}`} className="px-1.5 text-xs text-zinc-400">…</span>
          ) : (
            <PageButton
              key={p}
              label={String(p)}
              active={p === page}
              onClick={() => onPageChange(p as number)}
            />
          )
        )}
        <PageButton
          label="→"
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
        />
      </div>
    </div>
  )
}

function PageButton({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        min-w-[28px] h-7 px-2 text-xs rounded border transition-colors
        ${active
          ? 'bg-zinc-900 text-white border-zinc-900'
          : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50 hover:text-zinc-900'
        }
        disabled:opacity-40 disabled:cursor-not-allowed
      `}
    >
      {label}
    </button>
  )
}

function getPageNumbers(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages: (number | '…')[] = [1]

  if (current > 3) pages.push('…')

  for (let p = Math.max(2, current - 1); p <= Math.min(total - 1, current + 1); p++) {
    pages.push(p)
  }

  if (current < total - 2) pages.push('…')
  pages.push(total)

  return pages
}
