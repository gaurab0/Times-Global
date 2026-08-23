import React, { useState, useEffect, useCallback, useContext, useRef } from 'react';
import Input from '../common/Input';
import Button from '../common/Button';
import { apiService } from '../../services/apiService';
import { LocationContext } from '../LocationContext';
import {
  ApiResponse,
  datePickerRangeToUtc,
  getApiErrorMessage,
  sortByCheckInDesc,
  todayUtcRange,
  unwrapList,
} from '../../services/apiUtils';
import { enrichVisitorsWithImages } from '../../services/visitorImageService';
import VisitorTable, { Visitor } from './VisitorTable';
import VisitorHistoryModal from './VisitorHistoryModal';
import PaginationControls from './PaginationControls';

const PAGE_SIZE = 10; // Must match DRF PAGE_SIZE in the backend settings.

const inputDarkStyle = 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400 focus:ring-red-500 focus:border-red-500 !py-2';
const labelStyles = 'block text-xs font-medium text-gray-300 mb-1';

const VMSVisitorListPage: React.FC = () => {
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [searchName, setSearchName] = useState<string>('');

  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [visitorsCount, setVisitorsCount] = useState<number>(0);
  const [reportVisitorsPage, setReportVisitorsPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasGeneratedReportOutput, setHasGeneratedReportOutput] = useState<boolean>(false);

  const [todaysVisitors, setTodaysVisitors] = useState<Visitor[]>([]);
  const [isLoadingTodaysVisitors, setIsLoadingTodaysVisitors] = useState<boolean>(true);
  const [todaysVisitorsError, setTodaysVisitorsError] = useState<string | null>(null);
  const [todaysVisitorsPage, setTodaysVisitorsPage] = useState<number>(1);
  const [todaysVisitorsCount, setTodaysVisitorsCount] = useState<number>(0);

  const [selectedVisitorForHistory, setSelectedVisitorForHistory] = useState<Visitor | null>(null);
  const [visitorHistory, setVisitorHistory] = useState<Visitor[]>([]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Monotonic request ids let us ignore responses from superseded fetches
  // (e.g. when the location, filters or page change mid-flight).
  const todaysFetchIdRef = useRef(0);
  const reportFetchIdRef = useRef(0);
  const historyFetchAbortRef = useRef<AbortController | null>(null);

  const { selectedLocation } = useContext(LocationContext);

  const fetchTodaysVisitors = useCallback(async (page = 1) => {
    const fetchId = ++todaysFetchIdRef.current;
    if (!selectedLocation?.id) {
      setTodaysVisitors([]);
      setTodaysVisitorsCount(0);
      setTodaysVisitorsPage(1);
      setIsLoadingTodaysVisitors(false);
      setTodaysVisitorsError("No location selected to fetch today's visitors.");
      return;
    }
    const controller = new AbortController();
    setIsLoadingTodaysVisitors(true);
    setTodaysVisitorsError(null);
    try {
      const { after, before } = todayUtcRange();
      const queryParams = new URLSearchParams({
        check_in_time_after: after,
        check_in_time_before: before,
        page: String(page),
      });

      const data = await apiService.get<Visitor[] | ApiResponse<Visitor>>(
        `/visitors/?${queryParams.toString()}`,
        { signal: controller.signal }
      );
      if (fetchId !== todaysFetchIdRef.current) return;

      const fetched = unwrapList(data);
      const withImages = await enrichVisitorsWithImages(fetched, controller.signal);
      if (fetchId !== todaysFetchIdRef.current) return;
      setTodaysVisitors(sortByCheckInDesc(withImages));
      setTodaysVisitorsCount(Array.isArray(data) ? data.length : data?.count ?? 0);
      setTodaysVisitorsPage(page);
    } catch (err) {
      if (controller.signal.aborted || fetchId !== todaysFetchIdRef.current) return;
      console.error("Fetch Today's Visitors Error:", err);
      setTodaysVisitorsError(getApiErrorMessage(err, "Failed to fetch today's visitor list."));
      setTodaysVisitors([]);
      setTodaysVisitorsCount(0);
    } finally {
      if (fetchId === todaysFetchIdRef.current) {
        setIsLoadingTodaysVisitors(false);
      }
    }
  }, [selectedLocation]);

  const fetchVisitors = useCallback(async (page = 1) => {
    setHasGeneratedReportOutput(true);
    const fetchId = ++reportFetchIdRef.current;
    if (!selectedLocation?.id) {
      setError('A location must be selected to filter visitors.');
      setVisitors([]);
      setVisitorsCount(0);
      setIsLoading(false);
      return;
    }

    if (!dateFrom && !dateTo && !searchName.trim()) {
      setError('Please enter a name or select a date range to display report output.');
      setVisitors([]);
      setVisitorsCount(0);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setError(null);
    try {
      const queryParams = new URLSearchParams();
      // Treat picked dates as local days so they line up with the Today panel.
      if (dateFrom || dateTo) {
        const { after, before } = datePickerRangeToUtc(
          dateFrom || dateTo,
          dateTo || dateFrom
        );
        queryParams.append('check_in_time_after', after);
        queryParams.append('check_in_time_before', before);
      }
      if (searchName.trim()) queryParams.append('search', searchName.trim());
      queryParams.append('page', String(page));

      const data = await apiService.get<Visitor[] | ApiResponse<Visitor>>(
        `/visitors/?${queryParams.toString()}`,
        { signal: controller.signal }
      );
      if (fetchId !== reportFetchIdRef.current) return;

      const fetched = unwrapList(data);
      const withImages = await enrichVisitorsWithImages(fetched, controller.signal);
      if (fetchId !== reportFetchIdRef.current) return;
      setVisitors(sortByCheckInDesc(withImages));
      setVisitorsCount(Array.isArray(data) ? data.length : data?.count ?? 0);
      setReportVisitorsPage(page);
    } catch (err) {
      if (controller.signal.aborted || fetchId !== reportFetchIdRef.current) return;
      console.error('Fetch Visitors Error:', err);
      setError(getApiErrorMessage(err, 'Failed to fetch visitor list.'));
      setVisitors([]);
      setVisitorsCount(0);
    } finally {
      if (fetchId === reportFetchIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [dateFrom, dateTo, searchName, selectedLocation]);

  useEffect(() => {
    if (selectedLocation) {
      fetchTodaysVisitors();
    } else {
      todaysFetchIdRef.current++;
      reportFetchIdRef.current++;
      setIsLoadingTodaysVisitors(false);
      setIsLoading(false);
      setTodaysVisitors([]);
      setVisitors([]);
    }
    setHasGeneratedReportOutput(false);

    return () => {
      todaysFetchIdRef.current++;
      reportFetchIdRef.current++;
      historyFetchAbortRef.current?.abort();
    };
  }, [fetchTodaysVisitors, selectedLocation]);

  const handleFilterByDate = () => fetchVisitors();
  const handleSearchByName = () => fetchVisitors();
  const handleClearFilters = () => {
    setDateFrom('');
    setDateTo('');
    setSearchName('');
    setVisitors([]);
    setVisitorsCount(0);
    setError(null);
    setHasGeneratedReportOutput(false);
  };

  const applyCheckoutUpdate = (visitorId: string, checkOutTime?: string | null) => {
    setVisitors((prev) =>
      prev.map((v) => (v.id === visitorId ? { ...v, checkOutTime: checkOutTime ?? v.checkOutTime } : v))
    );
    setTodaysVisitors((prev) =>
      prev.map((tv) => (tv.id === visitorId ? { ...tv, checkOutTime: checkOutTime ?? tv.checkOutTime } : tv))
    );
  };

  const handleCheckOut = async (visitorId: string) => {
    if (!window.confirm('Are you sure you want to check out this visitor?')) return;
    try {
      const updatedVisitor = await apiService.patch<Visitor>(`/visitors/${visitorId}/checkout/`, {});
      applyCheckoutUpdate(visitorId, updatedVisitor?.checkOutTime);
      alert('Visitor checked out successfully.');
    } catch (err) {
      console.error('Check-out error:', err);
      alert(`Failed to check out visitor: ${getApiErrorMessage(err, 'Unknown error')}`);
    }
  };

  const handleViewHistory = async (visitor: Visitor) => {
    historyFetchAbortRef.current?.abort();
    const controller = new AbortController();
    historyFetchAbortRef.current = controller;

    setSelectedVisitorForHistory(visitor);
    setIsHistoryModalOpen(true);
    setIsLoadingHistory(true);
    setHistoryError(null);
    setVisitorHistory([]);
    try {
      const queryParams = new URLSearchParams({ search: visitor.fullName });
      const data = await apiService.get<Visitor[] | ApiResponse<Visitor>>(
        `/visitors/?${queryParams.toString()}`,
        { signal: controller.signal }
      );

      const historyEntries = unwrapList(data);
      const withImages = await enrichVisitorsWithImages(historyEntries, controller.signal);
      if (controller.signal.aborted) return;
      setVisitorHistory(sortByCheckInDesc(withImages));
    } catch (err) {
      if (controller.signal.aborted) return;
      console.error('Fetch Visitor History Error:', err);
      setHistoryError(getApiErrorMessage(err, 'Failed to fetch visitor history.'));
    } finally {
      if (!controller.signal.aborted) {
        setIsLoadingHistory(false);
      }
    }
  };

  const handleCloseHistoryModal = () => {
    historyFetchAbortRef.current?.abort();
    setIsHistoryModalOpen(false);
    setSelectedVisitorForHistory(null);
    setVisitorHistory([]);
    setHistoryError(null);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="bg-red-700 bg-opacity-75 backdrop-blur-sm text-white p-3 shadow-md">
        <h2 className="text-xl font-semibold text-center">Visitor List &amp; Management</h2>
      </div>

      <div className="flex-grow p-2 md:p-3 overflow-y-auto">
        <div className="mb-3 bg-slate-700 bg-opacity-60 backdrop-blur-md rounded-lg shadow border border-gray-700">
          <h3 className="text-lg font-semibold text-gray-100 p-2 sm:p-3 border-b border-gray-700">Today&apos;s Visitors</h3>
          {isLoadingTodaysVisitors && <p className="p-3 text-center text-gray-300">Loading today&apos;s visitors...</p>}
          {todaysVisitorsError && (
            <p role="alert" aria-live="assertive" className="p-3 text-center text-red-400 bg-red-900/50 rounded m-2">{todaysVisitorsError}</p>
          )}
          {!isLoadingTodaysVisitors && !todaysVisitorsError && (
            <div className="overflow-x-auto">
              <VisitorTable
                visitors={todaysVisitors}
                listType="today"
                onViewHistory={handleViewHistory}
                onCheckOut={handleCheckOut}
              />
              {todaysVisitors.length === 0 && (
                <p className="px-3 py-10 text-center text-sm text-gray-400">
                  No visitors checked in today for {selectedLocation?.name || 'the selected location'}.
                </p>
              )}
              <PaginationControls
                page={todaysVisitorsPage}
                totalCount={todaysVisitorsCount}
                pageSize={PAGE_SIZE}
                onPageChange={(page) => fetchTodaysVisitors(page)}
              />
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
                <Input type="date" id="dateFrom" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className={`${inputDarkStyle} w-full`} />
              </div>
              <div className="w-full md:w-auto flex-1">
                <label htmlFor="dateTo" className={labelStyles}>Date To:</label>
                <Input type="date" id="dateTo" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className={`${inputDarkStyle} w-full`} />
              </div>
              <Button onClick={handleFilterByDate} className="!px-3 md:!px-4 !py-2 text-sm w-full md:w-auto md:self-end">Filter by Date</Button>
            </div>
            <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-2 md:items-end">
              <div className="w-full md:w-auto flex-grow">
                <label htmlFor="searchName" className={labelStyles}>Search by Full Name:</label>
                <Input type="text" id="searchName" placeholder="Enter full name" value={searchName} onChange={(e) => setSearchName(e.target.value)} className={`${inputDarkStyle} w-full`} />
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
              {error && (
                <p role="alert" aria-live="assertive" className="p-4 text-center text-red-400 bg-red-900/50 rounded m-2">{error}</p>
              )}
              {!isLoading && !error && (
                <>
                  <VisitorTable
                    visitors={visitors}
                    listType="report"
                    onViewHistory={handleViewHistory}
                    onCheckOut={handleCheckOut}
                  />
                  {visitors.length === 0 && (
                    <p className="px-3 py-10 text-center text-sm text-gray-400">No report output found for the current filters.</p>
                  )}
                  <PaginationControls
                    page={reportVisitorsPage}
                    totalCount={visitorsCount}
                    pageSize={PAGE_SIZE}
                    onPageChange={(page) => fetchVisitors(page)}
                  />
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {isHistoryModalOpen && selectedVisitorForHistory && (
        <VisitorHistoryModal
          visitor={selectedVisitorForHistory}
          history={visitorHistory}
          isLoading={isLoadingHistory}
          error={historyError}
          onClose={handleCloseHistoryModal}
        />
      )}
    </div>
  );
};

export default VMSVisitorListPage;
