import React from 'react';
import { formatDate } from '../../services/apiUtils';

export interface Visitor {
  id: string;
  visitorImage?: string;
  idNumberType: string;
  fullName: string;
  checkInTime: string;
  checkOutTime?: string | null;
  contact?: string;
  email?: string;
  reason?: string;
  approvedBy?: string;
  requestedBy?: string;
  requestSource?: string;
}

export type VisitorListType = 'today' | 'report';

interface VisitorTableProps {
  visitors: Visitor[];
  listType: VisitorListType;
  onViewHistory: (visitor: Visitor) => void;
  onCheckOut: (visitorId: string) => void;
}

const cellClass =
  'px-1.5 py-1.5 sm:px-2 sm:py-2 whitespace-nowrap text-xs text-gray-300';
const headerClass =
  'px-1.5 py-1.5 sm:px-2 sm:py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider';

const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
  e.currentTarget.style.display = 'none';
};

const VisitorTable: React.FC<VisitorTableProps> = ({
  visitors,
  listType,
  onViewHistory,
  onCheckOut,
}) => {
  const isReport = listType === 'report';
  return (
    <table className="min-w-full divide-y divide-gray-700">
      <thead className="bg-gray-700">
        <tr>
          <th scope="col" className={headerClass}>Image</th>
          <th scope="col" className={headerClass}>ID Number/Type</th>
          <th scope="col" className={headerClass}>Full Name</th>
          {isReport && (
            <>
              <th scope="col" className={headerClass}>Contact</th>
              <th scope="col" className={headerClass}>Email</th>
            </>
          )}
          <th scope="col" className={headerClass}>Reason</th>
          {isReport && (
            <>
              <th scope="col" className={headerClass}>Approved By</th>
              <th scope="col" className={headerClass}>Requested By</th>
              <th scope="col" className={headerClass}>Request Source</th>
            </>
          )}
          <th scope="col" className={headerClass}>Check-In Time</th>
          <th scope="col" className={headerClass}>Check-Out Time</th>
          <th scope="col" className={headerClass}>Actions</th>
        </tr>
      </thead>
      <tbody className="bg-gray-800 divide-y divide-gray-700">
        {visitors.map((visitor) => (
          <tr key={`${listType}-${visitor.id}`} className="hover:bg-gray-700/50 transition-colors">
            <td className={`${cellClass} whitespace-nowrap`}>
              {visitor.visitorImage ? (
                <img
                  className="h-8 w-8 sm:h-10 sm:w-10 rounded-full object-cover"
                  src={visitor.visitorImage}
                  alt={visitor.fullName}
                  onError={handleImageError}
                />
              ) : (
                <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gray-600 flex items-center justify-center text-gray-400 text-xs">NoImg</div>
              )}
            </td>
            <td className={cellClass}>{visitor.idNumberType}</td>
            <td className={`${cellClass} font-medium text-gray-100`}>{visitor.fullName}</td>
            {isReport && (
              <>
                <td className={cellClass}>{visitor.contact || 'N/A'}</td>
                <td className={`${cellClass} truncate max-w-[100px] sm:max-w-[150px]`}>{visitor.email || 'N/A'}</td>
              </>
            )}
            <td className={`${cellClass} truncate max-w-[100px] sm:max-w-[150px]`} title={visitor.reason || undefined}>
              {visitor.reason || 'N/A'}
            </td>
            {isReport && (
              <>
                <td className={cellClass}>{visitor.approvedBy || 'N/A'}</td>
                <td className={cellClass}>{visitor.requestedBy || 'N/A'}</td>
                <td className={cellClass}>{visitor.requestSource || 'N/A'}</td>
              </>
            )}
            <td className={cellClass}>{formatDate(visitor.checkInTime)}</td>
            <td className={cellClass}>{formatDate(visitor.checkOutTime)}</td>
            <td className={`${cellClass} font-medium`}>
              <button onClick={() => onViewHistory(visitor)} className="text-red-400 hover:text-red-300 mr-1 sm:mr-2 transition-colors">View</button>
              {!visitor.checkOutTime && (
                <button onClick={() => onCheckOut(visitor.id)} className="text-blue-400 hover:text-blue-300 transition-colors">Check-Out</button>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default VisitorTable;
