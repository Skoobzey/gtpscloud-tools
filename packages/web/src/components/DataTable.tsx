import { cn } from '@/lib/utils';

interface Column<T> {
  key: keyof T | string;
  header: string;
  cell?: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
  className?: string;
}

export function DataTable<T extends { id: string | number }>({
  columns,
  data,
  emptyMessage = 'No data found.',
  className,
}: DataTableProps<T>) {
  return (
    <div className={cn('border border-[#27272a] rounded-xl overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#27272a] bg-[#111111]">
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={cn('text-left px-4 py-3 text-xs font-semibold text-[#71717a] uppercase tracking-wide', col.className)}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-10 text-center text-[#52525b]">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr key={row.id} className="border-b border-[#27272a] last:border-0 bg-[#0a0a0a] hover:bg-[#111111] transition-colors">
                  {columns.map((col) => (
                    <td key={String(col.key)} className={cn('px-4 py-3 text-[#d4d4d8]', col.className)}>
                      {col.cell ? col.cell(row) : String((row as Record<string, unknown>)[String(col.key)] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
