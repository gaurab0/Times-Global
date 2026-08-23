import React from 'react';
import Button from '../common/Button';
import { formatDate } from '../../services/apiUtils';
import { Visitor } from './VisitorTable';

interface VisitorHistoryModalProps {
  visitor: Visitor;
  history: Visitor[];
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
}

const cellClass =
  'px-1.5 py-1.5 sm:px-2 sm:py-2 whitespace-nowrap text-xs text-gray-300';
const headerClass =
  'px-1.5 py-1.5 sm:px-2 sm:py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider';

const VisitorHistoryModal: React.FC<VisitorHistoryModalProps> = ({
  visitor,
  history,
  isLoading,
  error,
  onClose,
}) => {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 backdrop-blur-sm flex items-center justify-center p-2 z-50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="visitorHistoryModalTitle"
    >
      <div
        className="bg-slate-800 p-3 sm:p-4 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-2 sm:mb-3">
          <h3 id="visitorHistoryModalTitle" className="text-md sm:text-lg font-semibold text-red-500">
            Visit History for: {visitor.fullName}
          </h3>
          <Button onClick={onClose} variant="secondary" className="!p-1 sm:!p-1.5 text-lg sm:text-xl leading-none">&times;</Button>
        </div>
        {isLoading && <p className="text-center text-gray-300 py-4">Loading history...</p>}
        {error && (
          <p role="alert" className="text-center text-red-400 bg-red-900/50 p-3 rounded my-2">{error}</p>
        )}
        {!isLoading && !error && (
          <div className="overflow-y-auto flex-grow">
            {history.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-gray-700">
                    <tr>
                      <th scope="col" className={headerClass}>Check-In Time</th>
                      <th scope="col" className={headerClass}>Check-Out Time</th>
                      <th scope="col" className={headerClass}>Reason</th>
                      <th scope="col" className={headerClass}>Approved By</th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-800 divide-y divide-gray-700">
                    {history.map((entry) => (
                      <tr key={`hist-${entry.id}`} className="hover:bg-gray-700/50">
                        <td className={cellClass}>{formatDate(entry.checkInTime)}</td>
                        <td className={cellClass}>{formatDate(entry.checkOutTime)}</td>
                        <td
                          className={`${cellClass} truncate max-w-[100px] sm:max-w-xs`}
                          title={entry.reason || undefined}
                        >
                          {entry.reason || 'N/A'}
                        </td>
                        <td className={cellClass}>{entry.approvedBy || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-gray-400 py-4">No visit history found for this visitor.</p>
            )}
          </div>
        )}
        <div className="mt-3 sm:mt-4 text-right">
          <Button onClick={onClose} variant="secondary" className="!px-3 !py-1.5 text-sm">Close</Button>
        </div>
      </div>
    </div>
  );
};

export default VisitorHistoryModal;
