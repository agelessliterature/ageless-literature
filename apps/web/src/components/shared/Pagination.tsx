'use client';

import { useState } from 'react';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  showItemCount?: boolean;
  showJumpTo?: boolean;
  className?: string;
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  showItemCount = true,
  showJumpTo = true,
  className = '',
}: PaginationProps) {
  const [jumpToPage, setJumpToPage] = useState('');

  if (totalPages <= 1) return null;

  const handleJumpToPage = () => {
    const pageNum = parseInt(jumpToPage);
    if (pageNum >= 1 && pageNum <= totalPages) {
      onPageChange(pageNum);
      setJumpToPage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleJumpToPage();
    }
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (currentPage <= 3) {
        pages.push(2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push('...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push('...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }

    return pages;
  };

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className={`bg-white border-t border-gray-200 px-4 py-3 sm:px-6 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {showItemCount && (
          <div className="text-sm text-gray-700">
            Showing <span className="font-medium">{startItem}</span> to{' '}
            <span className="font-medium">{endItem}</span> of{' '}
            <span className="font-medium">{totalItems}</span> results
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-end">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="relative inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-md"
            aria-label="Previous page"
          >
            <FontAwesomeIcon icon={['fal', 'chevron-left']} className="mr-2" />
            Previous
          </button>

          <div className="inline-flex items-center gap-1">
            {getPageNumbers().map((pageNum, index) => {
              if (pageNum === '...') {
                return (
                  <span
                    key={`ellipsis-${index}`}
                    className="relative inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700"
                  >
                    ...
                  </span>
                );
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum as number)}
                  className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium rounded-md ${
                    pageNum === currentPage
                      ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                      : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                  }`}
                  aria-label={`Go to page ${pageNum}`}
                  aria-current={pageNum === currentPage ? 'page' : undefined}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="relative inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-md"
            aria-label="Next page"
          >
            Next
            <FontAwesomeIcon icon={['fal', 'chevron-right']} className="ml-2" />
          </button>

          {showJumpTo && totalPages > 10 && (
            <div className="flex items-center gap-2 ml-4">
              <span className="text-sm text-gray-700">Go to:</span>
              <input
                type="number"
                min="1"
                max={totalPages}
                value={jumpToPage}
                onChange={(e) => setJumpToPage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="#"
                className="w-16 px-2 py-1 border border-gray-300 rounded-md text-sm"
                aria-label="Jump to page number"
              />
              <button
                onClick={handleJumpToPage}
                disabled={!jumpToPage}
                className="px-3 py-1 bg-primary text-white text-sm rounded-md hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Go
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
