import React from 'react';
import Button from '../common/Button';

interface PaginationControlsProps {
  page: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

const PaginationControls: React.FC<PaginationControlsProps> = ({
  page,
  totalCount,
  pageSize,
  onPageChange,
}) => {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  if (totalCount === 0) return null;

  const firstItem = (page - 1) * pageSize + 1;
  const lastItem = Math.min(page * pageSize, totalCount);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-3 py-2 border-t border-gray-700">
      <p className="text-xs text-gray-400">
        Showing {firstItem}&ndash;{lastItem} of {totalCount} visitor{totalCount === 1 ? '' : 's'} (page {page} of {totalPages})
      </p>
      <div className="flex items-center space-x-2">
        <Button
          type="button"
          variant="secondary"
          className="!px-3 !py-1.5 text-sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          &larr; Previous
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="!px-3 !py-1.5 text-sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next &rarr;
        </Button>
      </div>
    </div>
  );
};

export default PaginationControls;
