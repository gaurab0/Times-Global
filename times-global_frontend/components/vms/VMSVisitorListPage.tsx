import React, { useState, useEffect, useCallback, useContext } from 'react'; // Added useContext
import Input from '../common/Input';
import Button from '../common/Button';
import { apiService } from '../../services/apiService';
import { LocationContext } from '../LocationContext'; // Import LocationContext

interface Visitor {
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

interface StoredImage {
  id: string;
  fullName: string;
  imageFile: string;
  idType: string;
}

interface ApiResponse<T> {
  results?: T[];
  [key: string]: any; 
}

const VMSVisitorListPage: React.FC = () => {
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [searchName, setSearchName] = useState<string>('');
  
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasGeneratedReportOutput, setHasGeneratedReportOutput] = useState<boolean>(false);

  const [todaysVisitors, setTodaysVisitors] = useState<Visitor[]>([]);
  const [isLoadingTodaysVisitors, setIsLoadingTodaysVisitors] = useState<boolean>(true);
  const [todaysVisitorsError, setTodaysVisitorsError] = useState<string | null>(null);

  const [selectedVisitorForHistory, setSelectedVisitorForHistory] = useState<Visitor | null>(null);
  const [visitorHistory, setVisitorHistory] = useState<Visitor[]>([]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  
  const { selectedLocation } = useContext(LocationContext); // Get selectedLocation


  const handleDateFromChange = (e: React.ChangeEvent<HTMLInputElement>) => setDateFrom(e.target.value);
  const handleDateToChange = (e: React.ChangeEvent<HTMLInputElement>) => setDateTo(e.target.value);
  const handleSearchNameChange = (e: React.ChangeEvent<HTMLInputElement>) => setSearchName(e.target.value);
  
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = 'https://via.placeholder.com/40/CCCCCC/FFFFFF?Text=NoImg';
  };

  const enrichVisitorsWithImages = async (visitorList: Visitor[]): Promise<Visitor[]> => {
    return Promise.all(
      visitorList.map(async (visitor: Visitor) => {
        if (!visitor.visitorImage && visitor.fullName) { 
          try {
            // Image search should not be location-scoped, assuming images are global
            const imageData = await apiService.get<StoredImage[] | ApiResponse<StoredImage>>(`/images/?search=${encodeURIComponent(visitor.fullName)}`);
            const images: StoredImage[] = Array.isArray(imageData) ? imageData : (imageData?.results || []);
            if (images.length > 0 && images[0].imageFile) {
              return { ...visitor, visitorImage: images[0].imageFile };
            }
          } catch (imgError) {
            console.warn(`Could not fetch image for ${visitor.fullName}:`, imgError);
          }
        }
        return visitor;
      })
    );
  };

  const fetchTodaysVisitors = useCallback(async () => {
    if (!selectedLocation?.id) { // Ensure location is selected
      setTodaysVisitors([]);
      setIsLoadingTodaysVisitors(false);
      setTodaysVisitorsError("No location selected to fetch today's visitors.");
      return;
    }
    setIsLoadingTodaysVisitors(true);
    setTodaysVisitorsError(null);
    try {
      const today = new Date();
      const todayStart = new Date(today.setHours(0, 0, 0, 0)).toISOString();
      const todayEnd = new Date(today.setHours(23, 59, 59, 999)).toISOString();

      // apiService will append location_id based on selectedLocation in context
      let queryParams = new URLSearchParams();
      queryParams.append('check_in_time_after', todayStart);
      queryParams.append('check_in_time_before', todayEnd);
      
      const data = await apiService.get<Visitor[] | ApiResponse<Visitor>>(`/visitors/?${queryParams.toString()}`);
      let fetchedTodaysVisitors: Visitor[] = Array.isArray(data) ? data : (data?.results || []);
      
      const visitorsWithImages = await enrichVisitorsWithImages(fetchedTodaysVisitors);
      setTodaysVisitors(visitorsWithImages.sort((a, b) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime()));
    } catch (err: any) {
      console.error('Fetch Today\'s Visitors Error:', err);
      setTodaysVisitorsError(err.data?.detail || err.message || "Failed to fetch today's visitor list.");
      setTodaysVisitors([]);
    } finally {
      setIsLoadingTodaysVisitors(false);
    }
  }, [selectedLocation]); // Depend on selectedLocation

  const fetchVisitors = useCallback(async () => {
    setHasGeneratedReportOutput(true);

    if (!selectedLocation?.id) { // Require location if filtering
        setError("A location must be selected to filter visitors.");
        setVisitors([]);
        setIsLoading(false);
        return;
    }

    if (!dateFrom && !dateTo && !searchName.trim()) {
        setError("Please enter a name or select a date range to display report output.");
        setVisitors([]);
        setIsLoading(false);
        return;
    }

    setIsLoading(true);
    setError(null);
    try {
      // apiService will append location_id if selectedLocation.id exists
      let queryParams = new URLSearchParams();
      if (dateFrom) queryParams.append('check_in_time_after', dateFrom + "T00:00:00Z"); 
      if (dateTo) queryParams.append('check_in_time_before', dateTo + "T23:59:59Z");   
      if (searchName) queryParams.append('search', searchName); 

      const data = await apiService.get<Visitor[] | ApiResponse<Visitor>>(`/visitors/?${queryParams.toString()}`);
      let fetchedVisitors: Visitor[] = Array.isArray(data) ? data : (data?.results || []);
      
      const visitorsWithImages = await enrichVisitorsWithImages(fetchedVisitors);
      setVisitors(visitorsWithImages.sort((a, b) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime()));
    } catch (err: any) { 
      console.error('Fetch Visitors Error:', err);
      setError(err.data?.detail || err.message || 'Failed to fetch visitor list.');
      setVisitors([]);
    } finally {
      setIsLoading(false);
    }
  }, [dateFrom, dateTo, searchName, selectedLocation]); // Depend on selectedLocation

  useEffect(() => {
    // ProtectedRoute should ensure selectedLocation exists if this page is rendered.
    if (selectedLocation) {
        fetchTodaysVisitors();
    } else {
        // Handle case where page might be rendered without selectedLocation (should ideally be prevented by router)
        setIsLoadingTodaysVisitors(false);
        setIsLoading(false);
        setTodaysVisitors([]);
        setVisitors([]);
        // Optional: set a message if needed, but router should prevent this state.
    }
    setHasGeneratedReportOutput(false);
  }, [fetchTodaysVisitors, selectedLocation]);

  const handleFilterByDate = () => fetchVisitors();
  const handleSearchByName = () => fetchVisitors();
  const handleClearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setSearchName('');
    setVisitors([]);
    setError(null);
    setHasGeneratedReportOutput(false);
  };

  const handleCheckOut = async (visitorId: string) => {
    if (!window.confirm('Are you sure you want to check out this visitor?')) return;
    try {
      // apiService will append location_id
      const updatedVisitor = await apiService.patch<Visitor>(`/visitors/${visitorId}/checkout/`, {}); 
      
      setVisitors((prevVisitors: Visitor[]) => 
        prevVisitors.map((v: Visitor) => v.id === visitorId ? { ...v, checkOutTime: updatedVisitor?.checkOutTime } : v)
      );
      setTodaysVisitors((prevTodays: Visitor[]) =>
        prevTodays.map(tv =>
          tv.id === visitorId ? { ...tv, checkOutTime: updatedVisitor?.checkOutTime } : tv
        )
      );
      if (updatedVisitor) {
        alert('Visitor checked out successfully.');
      } else {
        alert('Visitor checkout processed. (No confirmation data returned)');
        fetchTodaysVisitors(); 
        fetchVisitors();
      }
    } catch (err: any) {
      console.error('Check-out error:', err);
      alert(`Failed to check out visitor: ${err.data?.detail || err.message}`);
    }
  };

  const handleViewHistory = async (visitor: Visitor) => {
    setSelectedVisitorForHistory(visitor);
    setIsHistoryModalOpen(true);
    setIsLoadingHistory(true);
    setHistoryError(null);
    setVisitorHistory([]);
    try {
      // apiService will append location_id for the /visitors/ endpoint
      const queryParams = new URLSearchParams({ search: visitor.fullName });
      const data = await apiService.get<Visitor[] | ApiResponse<Visitor>>(`/visitors/?${queryParams.toString()}`);
      let historyEntries: Visitor[] = Array.isArray(data) ? data : (data?.results || []);

      const historyWithImages = await enrichVisitorsWithImages(historyEntries);
      setVisitorHistory(historyWithImages.sort((a, b) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime()));
    } catch (err: any) {
      console.error('Fetch Visitor History Error:', err);
      setHistoryError(err.data?.detail || err.message || 'Failed to fetch visitor history.');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleCloseHistoryModal = () => {
    setIsHistoryModalOpen(false);
    setSelectedVisitorForHistory(null);
    setVisitorHistory([]);
    setHistoryError(null);
  };
  
  const inputDarkStyle = "bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400 focus:ring-red-500 focus:border-red-500 !py-2";
  const labelStyles = "block text-xs font-medium text-gray-300 mb-1";

  const formatDate = (isoString?: string | null, includeTime: boolean = true) => {
    if (!isoString) return 'N/A';
    try {
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric', month: '2-digit', day: '2-digit',
      };
      if (includeTime) {
        options.hour = '2-digit';
        options.minute = '2-digit';
        // options.second = '2-digit'; // Seconds can make it too busy
        options.hour12 = true;
      }
      return new Date(isoString).toLocaleString('en-US', options);
    } catch {
      return isoString; 
    }
  };

  const renderVisitorTable = (visitorList: Visitor[], listType: 'today' | 'report') => {
    // If ProtectedRoute is working, we assume the user is approved and has a location.
    // Error messages are for API failures.
    if (!visitorList || visitorList.length === 0) {
      if (listType === 'today' && !isLoadingTodaysVisitors && !todaysVisitorsError) {
          return <p className="px-3 py-10 text-center text-sm text-gray-400">No visitors checked in today for {selectedLocation?.name || 'the selected location'}.</p>;
      }
      if (listType === 'report' && !isLoading && !error && hasGeneratedReportOutput) {
        return <p className="px-3 py-10 text-center text-sm text-gray-400">No report output found for the current filters.</p>;
      }
      return null; // Let loading/error messages handle other states
    }
    return (
      <table className="min-w-full divide-y divide-gray-700">
        <thead className="bg-gray-700">
          <tr>
            <th scope="col" className="px-1.5 py-1.5 sm:px-2 sm:py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Image</th>
            <th scope="col" className="px-1.5 py-1.5 sm:px-2 sm:py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">ID Number/Type</th>
            <th scope="col" className="px-1.5 py-1.5 sm:px-2 sm:py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Full Name</th>
            {listType === 'report' && (
              <>
                <th scope="col" className="px-1.5 py-1.5 sm:px-2 sm:py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Contact</th>
                <th scope="col" className="px-1.5 py-1.5 sm:px-2 sm:py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Email</th>
              </>
            )}
            <th scope="col" className="px-1.5 py-1.5 sm:px-2 sm:py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Reason</th>
            {listType === 'report' && (
              <>
                <th scope="col" className="px-1.5 py-1.5 sm:px-2 sm:py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Approved By</th>
                <th scope="col" className="px-1.5 py-1.5 sm:px-2 sm:py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Requested By</th>
                <th scope="col" className="px-1.5 py-1.5 sm:px-2 sm:py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Request Source</th>
              </>
            )}
            <th scope="col" className="px-1.5 py-1.5 sm:px-2 sm:py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Check-In Time</th>
            <th scope="col" className="px-1.5 py-1.5 sm:px-2 sm:py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Check-Out Time</th>
            <th scope="col" className="px-1.5 py-1.5 sm:px-2 sm:py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-gray-800 divide-y divide-gray-700">
          {visitorList.map((visitor: Visitor) => (
            <tr key={`${listType}-${visitor.id}`} className="hover:bg-gray-700/50 transition-colors">
              <td className="px-1.5 py-1.5 sm:px-2 sm:py-2 whitespace-nowrap">
                {visitor.visitorImage ? (
                  <img className="h-8 w-8 sm:h-10 sm:w-10 rounded-full object-cover" src={visitor.visitorImage} alt={visitor.fullName} onError={handleImageError} />
                ) : (
                  <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gray-600 flex items-center justify-center text-gray-400 text-xs">NoImg</div>
                )}
              </td>
              <td className="px-1.5 py-1.5 sm:px-2 sm:py-2 whitespace-nowrap text-xs text-gray-300">{visitor.idNumberType}</td>
              <td className="px-1.5 py-1.5 sm:px-2 sm:py-2 whitespace-nowrap text-xs font-medium text-gray-100">{visitor.fullName}</td>
              {listType === 'report' && (
                <>
                  <td className="px-1.5 py-1.5 sm:px-2 sm:py-2 whitespace-nowrap text-xs text-gray-300">{visitor.contact || 'N/A'}</td>
                  <td className="px-1.5 py-1.5 sm:px-2 sm:py-2 whitespace-nowrap text-xs text-gray-300 truncate max-w-[100px] sm:max-w-[150px]">{visitor.email || 'N/A'}</td>
                </>
              )}
              <td className="px-1.5 py-1.5 sm:px-2 sm:py-2 whitespace-nowrap text-xs text-gray-300 truncate max-w-[100px] sm:max-w-[150px]" title={visitor.reason || undefined}>{visitor.reason || 'N/A'}</td>
              {listType === 'report' && (
                <>
                  <td className="px-1.5 py-1.5 sm:px-2 sm:py-2 whitespace-nowrap text-xs text-gray-300">{visitor.approvedBy || 'N/A'}</td>
                  <td className="px-1.5 py-1.5 sm:px-2 sm:py-2 whitespace-nowrap text-xs text-gray-300">{visitor.requestedBy || 'N/A'}</td>
                  <td className="px-1.5 py-1.5 sm:px-2 sm:py-2 whitespace-nowrap text-xs text-gray-300">{visitor.requestSource || 'N/A'}</td>
                </>
              )}
              <td className="px-1.5 py-1.5 sm:px-2 sm:py-2 whitespace-nowrap text-xs text-gray-300">{formatDate(visitor.checkInTime)}</td>
              <td className="px-1.5 py-1.5 sm:px-2 sm:py-2 whitespace-nowrap text-xs text-gray-300">{formatDate(visitor.checkOutTime)}</td>
              <td className="px-1.5 py-1.5 sm:px-2 sm:py-2 whitespace-nowrap text-xs font-medium">
                <button onClick={() => handleViewHistory(visitor)} className="text-red-400 hover:text-red-300 mr-1 sm:mr-2 transition-colors">View</button>
                {!visitor.checkOutTime && (
                     <button onClick={() => handleCheckOut(visitor.id)} className="text-blue-400 hover:text-blue-300 transition-colors">Check-Out</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-red-700 bg-opacity-75 backdrop-blur-sm text-white p-3 shadow-md">
        <h2 className="text-xl font-semibold text-center">Visitor List & Management</h2>
      </div>
      
      <div className="flex-grow p-2 md:p-3 overflow-y-auto">
        <div className="mb-3 bg-slate-700 bg-opacity-60 backdrop-blur-md rounded-lg shadow border border-gray-700">
          <h3 className="text-lg font-semibold text-gray-100 p-2 sm:p-3 border-b border-gray-700">Today's Visitors</h3>
          {isLoadingTodaysVisitors && <p className="p-3 text-center text-gray-300">Loading today's visitors...</p>}
          {todaysVisitorsError && <p role="alert" aria-live="assertive" className="p-3 text-center text-red-400 bg-red-900/50 rounded m-2">{todaysVisitorsError}</p>}
          {!isLoadingTodaysVisitors && !todaysVisitorsError && (
            <div className="overflow-x-auto">
              {renderVisitorTable(todaysVisitors, 'today')}
            </div>
          )}
        </div>

        <hr className="border-gray-600 my-2 sm:my-3" />

        <div className="mb-3 p-2 sm:p-3 bg-slate-700 bg-opacity-60 backdrop-blur-md rounded-lg shadow border border-gray-700">
          <h3 className="text-lg font-semibold text-gray-100 mb-2 sm:mb-3">Search Visitor Log</h3>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 sm:gap-3 items-end">
            <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-2 md:items-end lg:col-span-2">
              <div className="w-full md:w-auto flex-1">
                <label htmlFor="dateFrom" className={labelStyles}>Date From:</label>
                <Input type="date" id="dateFrom" value={dateFrom} onChange={handleDateFromChange} className={`${inputDarkStyle} w-full`} />
              </div>
              <div className="w-full md:w-auto flex-1">
                <label htmlFor="dateTo" className={labelStyles}>Date To:</label>
                <Input type="date" id="dateTo" value={dateTo} onChange={handleDateToChange} className={`${inputDarkStyle} w-full`} />
              </div>
              <Button onClick={handleFilterByDate} className="!px-3 md:!px-4 !py-2 text-sm w-full md:w-auto md:self-end">Filter by Date</Button>
            </div>
            <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-2 md:items-end">
              <div className="w-full md:w-auto flex-grow">
                <label htmlFor="searchName" className={labelStyles}>Search by Full Name:</label>
                <Input type="text" id="searchName" placeholder="Enter full name" value={searchName} onChange={handleSearchNameChange} className={`${inputDarkStyle} w-full`} />
              </div>
              <Button onClick={handleSearchByName} className="!px-3 md:!px-4 !py-2 text-sm w-full md:w-auto md:self-end">Search by Name</Button>
            </div>
          </div>
          <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <p className="text-xs text-gray-300">Report output appears here only after applying a date filter or name search.</p>
            <Button onClick={handleClearFilters} variant="secondary" className="!px-3 !py-2 text-sm w-full sm:w-auto">Clear Report Output</Button>
          </div>
        </div>
        
        {hasGeneratedReportOutput && (
          <div className="overflow-x-auto">
            <div className="bg-slate-700 bg-opacity-60 backdrop-blur-md shadow-md rounded-lg overflow-hidden border border-gray-700">
              <h3 className="text-lg font-semibold text-gray-100 p-2 sm:p-3 border-b border-gray-700">Report Output</h3>
              {isLoading && <p className="p-4 text-center text-gray-300">Loading report output...</p>}
              {error && <p role="alert" aria-live="assertive" className="p-4 text-center text-red-400 bg-red-900/50 rounded m-2">{error}</p>}
              {!isLoading && !error && renderVisitorTable(visitors, 'report')}
            </div>
          </div>
        )}
      </div>

      {isHistoryModalOpen && selectedVisitorForHistory && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 backdrop-blur-sm flex items-center justify-center p-2 z-50"
          onClick={handleCloseHistoryModal} 
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
                Visit History for: {selectedVisitorForHistory.fullName}
              </h3>
              <Button onClick={handleCloseHistoryModal} variant="secondary" className="!p-1 sm:!p-1.5 text-lg sm:text-xl leading-none">&times;</Button>
            </div>
            {isLoadingHistory && <p className="text-center text-gray-300 py-4">Loading history...</p>}
            {historyError && <p role="alert" className="text-center text-red-400 bg-red-900/50 p-3 rounded my-2">{historyError}</p>}
            {!isLoadingHistory && !historyError && (
              <div className="overflow-y-auto flex-grow">
                {visitorHistory.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-700">
                      <thead className="bg-gray-700">
                        <tr>
                          <th scope="col" className="px-1.5 py-1.5 sm:px-2 sm:py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Check-In Time</th>
                          <th scope="col" className="px-1.5 py-1.5 sm:px-2 sm:py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Check-Out Time</th>
                          <th scope="col" className="px-1.5 py-1.5 sm:px-2 sm:py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Reason</th>
                          <th scope="col" className="px-1.5 py-1.5 sm:px-2 sm:py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Approved By</th>
                        </tr>
                      </thead>
                      <tbody className="bg-gray-800 divide-y divide-gray-700">
                        {visitorHistory.map(entry => (
                          <tr key={`hist-${entry.id}`} className="hover:bg-gray-700/50">
                            <td className="px-1.5 py-1.5 sm:px-2 sm:py-2 whitespace-nowrap text-xs text-gray-300">{formatDate(entry.checkInTime)}</td>
                            <td className="px-1.5 py-1.5 sm:px-2 sm:py-2 whitespace-nowrap text-xs text-gray-300">{formatDate(entry.checkOutTime)}</td>
                            <td className="px-1.5 py-1.5 sm:px-2 sm:py-2 whitespace-nowrap text-xs text-gray-300 truncate max-w-[100px] sm:max-w-xs" title={entry.reason || undefined}>{entry.reason || 'N/A'}</td>
                            <td className="px-1.5 py-1.5 sm:px-2 sm:py-2 whitespace-nowrap text-xs text-gray-300">{entry.approvedBy || 'N/A'}</td>
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
              <Button onClick={handleCloseHistoryModal} variant="secondary" className="!px-3 !py-1.5 text-sm">Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VMSVisitorListPage;
