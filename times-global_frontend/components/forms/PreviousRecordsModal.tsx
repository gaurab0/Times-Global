import React from 'react';
import Input from '../common/Input';
import Button from '../common/Button';

export interface PreviousRecordBase {
  id: string;
  updated_at?: string;
}

interface PreviousRecordsModalProps<T extends PreviousRecordBase> {
  modalTitle: string;
  searchInputLabel: string;
  searchInputId: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  records: T[];
  isLoading: boolean;
  error: string | null;
  emptyMessage: string;
  loadingRecordId: string | null;
  actionTypeForLoading: 'View' | 'Reprint' | null;
  onView: (id: string) => void;
  onReprint: (id: string) => void;
  onClose: () => void;
  /** Renders the left-hand detail lines for one record row. */
  renderRecordDetails: (record: T) => React.ReactNode;
  /** Pagination: whether there are more pages to load */
  hasMore?: boolean;
  /** Pagination: whether a "load more" request is in flight */
  isLoadingMore?: boolean;
  /** Pagination: callback to load the next page */
  onLoadMore?: () => void;
}

/**
 * Shared "previous records" picker modal used by DeviceStorageForm (receipts)
 * and GatePassForm (passes). Debounced search lives in the parent.
 */
function PreviousRecordsModal<T extends PreviousRecordBase>({
  modalTitle,
  searchInputLabel,
  searchInputId,
  searchValue,
  onSearchChange,
  records,
  isLoading,
  error,
  emptyMessage,
  loadingRecordId,
  actionTypeForLoading,
  onView,
  onReprint,
  onClose,
  renderRecordDetails,
  hasMore,
  isLoadingMore,
  onLoadMore,
}: PreviousRecordsModalProps<T>) {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="previousRecordsModalTitle"
    >
      <div
        className="bg-slate-800 bg-opacity-80 backdrop-blur-md p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 id="previousRecordsModalTitle" className="text-2xl font-semibold text-red-500">{modalTitle}</h3>
          <Button type="button" onClick={onClose} variant="secondary" className="!p-2">&times;</Button>
        </div>
        <div className="mb-4">
          <label htmlFor={searchInputId} className="block text-sm font-medium text-gray-300 mb-1">{searchInputLabel}</label>
          <Input
            id={searchInputId}
            name={searchInputId}
            type="search"
            value={searchValue}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value)}
            placeholder={searchInputLabel}
          />
        </div>
        {isLoading && records.length > 0 && (
          <p className="mb-3 text-center text-xs text-gray-300">Updating results...</p>
        )}
        {error && <p role="alert" className="text-center text-red-400 bg-red-900/50 p-3 rounded">{error}</p>}
        {!error && (
          <div
            className={`overflow-y-auto flex-grow pr-1 transition-opacity duration-150 ${isLoading && records.length > 0 ? 'opacity-70' : 'opacity-100'} ${records.length > 10 ? 'max-h-[400px] overflow-y-auto' : ''}`}
          >
            {records.length === 0 ? (
              <p className="text-center text-gray-400 py-4">
                {isLoading ? 'Loading...' : emptyMessage}
              </p>
            ) : (
              <>
                <ul className="space-y-3">
                  {records.map((record) => (
                    <li key={record.id} className="bg-slate-700 bg-opacity-70 backdrop-blur-sm p-4 rounded-md flex justify-between items-center">
                      <div>
                        {renderRecordDetails(record)}
                        {record.updated_at && (
                          <p className="text-xs text-gray-400">Last Updated: {new Date(record.updated_at).toLocaleString()}</p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          type="button"
                          onClick={() => onView(record.id)}
                          className="!px-3 !py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white"
                          disabled={loadingRecordId === record.id}
                        >
                          {loadingRecordId === record.id && actionTypeForLoading === 'View' ? 'Loading...' : 'View'}
                        </Button>
                        <Button
                          type="button"
                          onClick={() => onReprint(record.id)}
                          variant="primary"
                          className="!px-3 !py-1.5 text-sm"
                          disabled={loadingRecordId === record.id}
                        >
                          {loadingRecordId === record.id && actionTypeForLoading === 'Reprint' ? 'Loading...' : 'Reprint'}
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
                {hasMore && (
                  <div className="mt-4 flex justify-center">
                    <Button
                      type="button"
                      onClick={onLoadMore}
                      disabled={isLoadingMore}
                      className="bg-teal-600 hover:bg-teal-700 text-white"
                    >
                      {isLoadingMore ? 'Loading more...' : 'Load more'}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
        <div className="mt-4 text-right">
          <Button type="button" onClick={onClose} variant="secondary">Close</Button>
        </div>
      </div>
    </div>
  );
}

export default PreviousRecordsModal;
