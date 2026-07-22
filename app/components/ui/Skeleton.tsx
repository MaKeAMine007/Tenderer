export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-zinc-200 rounded ${className}`}
    />
  )
}

export function TableRowSkeleton() {
  return (
    <tr className="border-b border-zinc-100">
      <td className="px-4 py-3"><Skeleton className="h-5 w-14" /></td>
      <td className="px-4 py-3"><Skeleton className="h-4 w-full max-w-xs" /></td>
      <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
      <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
      <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
      <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
      <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
      <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
      <td className="px-4 py-3"><Skeleton className="h-5 w-14" /></td>
      <td className="px-4 py-3"><Skeleton className="h-4 w-10" /></td>
    </tr>
  )
}
