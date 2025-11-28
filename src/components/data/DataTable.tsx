'use client';

import clsx from 'clsx';
import type { ReactNode } from 'react';

type Column<T> = {
  key: keyof T | string;
  header: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
  render?: (item: T) => ReactNode;
};

type DataTableProps<T> = {
  data: T[];
  columns: Column<T>[];
  emptyMessage?: string;
  dense?: boolean;
  noHorizontalScroll?: boolean;
};

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  emptyMessage = 'No records found',
  dense,
  noHorizontalScroll = false
}: DataTableProps<T>) {
  return (
    <div className="overflow-hidden rounded border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className={clsx('relative overflow-y-visible', noHorizontalScroll ? 'overflow-x-hidden' : 'overflow-x-auto')}>
        <table className={clsx('w-full text-left', dense ? 'text-xs' : 'text-sm')}>
          <thead>
            <tr className="border-b-2 border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-800">
              {columns.map((column) => (
                <th
                  key={column.key as string}
                  className={clsx(
                    'px-3 py-2.5 font-bold text-gray-900 dark:text-gray-50',
                    dense ? 'text-xs' : 'text-sm',
                    column.className,
                    {
                      'text-left': column.align === 'left' || !column.align,
                      'text-center': column.align === 'center',
                      'text-right': column.align === 'right'
                    }
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-4 text-center text-gray-500 dark:text-gray-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item, rowIndex) => (
                <tr
                  key={`${item[columns[0].key as keyof T]}-${rowIndex}`}
                  className="border-b border-gray-200 text-gray-800 transition hover:bg-blue-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-700/50"
                >
                  {columns.map((column) => (
                    <td
                      key={`${column.key as string}-${rowIndex}`}
                      className={clsx(
                        dense ? 'px-2 py-1.5' : 'px-3 py-2',
                        column.className,
                        {
                          'text-left': column.align === 'left' || !column.align,
                          'text-center': column.align === 'center',
                          'text-right': column.align === 'right'
                        }
                      )}
                    >
                      {column.render
                        ? column.render(item)
                        : (item[column.key as keyof T] as ReactNode)}
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

