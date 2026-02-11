"use client";

type Column<T> = {
  key: string;
  header: React.ReactNode;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
};

type DataTableProps<T> = {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  /** Shown in table cell when data is empty (default). */
  emptyMessage?: string;
  /** When provided, rendered instead of table when data is empty (e.g. EmptyState component). */
  emptySlot?: React.ReactNode;
  onSort?: (key: string) => void;
  sortKey?: string;
  sortDir?: "asc" | "desc";
};

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  emptyMessage = "Žádná data",
  emptySlot,
  onSort,
  sortKey,
  sortDir,
}: DataTableProps<T>): React.ReactElement {
  if (data.length === 0 && emptySlot) {
    return (
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        {emptySlot}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className="px-4 py-2 font-medium text-gray-700"
              >
                {col.sortable && onSort ? (
                  <button
                    type="button"
                    className="flex items-center gap-1 hover:text-primary-600"
                    onClick={() => onSort(col.key)}
                  >
                    {col.header}
                    {sortKey === col.key && (
                      <span aria-hidden>{sortDir === "asc" ? "↑" : "↓"}</span>
                    )}
                  </button>
                ) : (
                  col.header
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr key={keyExtractor(row)} className="hover:bg-gray-50">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-2 text-gray-900">
                    {col.render
                      ? col.render(row)
                      : (row as Record<string, unknown>)[col.key] as React.ReactNode}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
