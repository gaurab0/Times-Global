import React, { useState, useEffect, useContext } from 'react'; 
import { useNavigate } from 'react-router-dom';
import Input from '../common/Input';
import Button from '../common/Button';
import { apiService } from '../../services/apiService';
import { ApiResponse, formatDateShort } from '../../services/apiUtils';
import { getSubmissionErrorMessage } from '../../services/formErrorUtils';
import PrintableGatePass from './PrintableGatePass'; 
import PreviousRecordsModal from './PreviousRecordsModal';
import { LocationContext } from '../LocationContext'; 

interface GatePassFormProps {
  onLogout: () => void;
}

interface GatePassItem {
  id: string; 
  sno: string; 
  itemName: string;
  description: string;
  quantity: string;
  remarks: string;
}

interface GatePassItemPayload { 
  sno: string;
  itemName: string;
  description: string;
  quantity: string;
  remarks: string;
}

interface GatePassResponseData { 
  id: string; 
  recipient_name: string;
  recipient_address: string;
  items: GatePassItemPayload[]; 
  prepared_by: string;
  received_by: string;
  approved_by: string;
  pass_date: string; 
  location_id?: string | number; 
  created_at?: string;
  updated_at?: string;
}


const GatePassForm: React.FC<GatePassFormProps> = ({ onLogout }) => {
  const navigate = useNavigate();
  const { selectedLocation, username } = useContext(LocationContext); 

  const initialRecipientName = '';
  const initialRecipientAddress = '';
  const initialPassDate = new Date().toISOString().split('T')[0];
  const initialItems = (): GatePassItem[] => [{ id: Date.now().toString(), sno: '', itemName: '', description: '', quantity: '', remarks: '' }];
  const getInitialPreparedBy = () => username || '';
  const initialReceivedBy = '';
  const initialApprovedBy = '';

  const [recipientName, setRecipientName] = useState<string>(initialRecipientName);
  const [recipientAddress, setRecipientAddress] = useState<string>(initialRecipientAddress);
  const [passDate, setPassDate] = useState<string>(initialPassDate); 

  const [items, setItems] = useState<GatePassItem[]>(initialItems());

  const [preparedBy, setPreparedBy] = useState<string>(getInitialPreparedBy()); 
  const [receivedBy, setReceivedBy] = useState<string>(initialReceivedBy);
  const [approvedBy, setApprovedBy] = useState<string>(initialApprovedBy);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [submittedGatePassData, setSubmittedGatePassData] = useState<GatePassResponseData | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState<boolean>(false);

  const [showPreviousPassesModal, setShowPreviousPassesModal] = useState<boolean>(false);
  const [previousPasses, setPreviousPasses] = useState<GatePassResponseData[]>([]);
  const [isLoadingPreviousPasses, setIsLoadingPreviousPasses] = useState<boolean>(false);
  const [previousPassesError, setPreviousPassesError] = useState<string | null>(null);
  const [previousPassesRecipientSearch, setPreviousPassesRecipientSearch] = useState<string>('');
  
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null); // For View/Reprint loading
  const [actionTypeForLoading, setActionTypeForLoading] = useState<'View' | 'Reprint' | null>(null);
  
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [isSavingChanges, setIsSavingChanges] = useState<boolean>(false);


  useEffect(() => {
    setPreparedBy(getInitialPreparedBy());
    if (!editingRecordId) { // Only reset if not in edit mode
        resetForm();
    }
  }, [username, selectedLocation]); // Removed editingRecordId to avoid re-resetting while editing


  const handleRecipientNameChange = (e: React.ChangeEvent<HTMLInputElement>) => setRecipientName(e.target.value);
  const handleRecipientAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => setRecipientAddress(e.target.value);
  const handlePassDateChange = (e: React.ChangeEvent<HTMLInputElement>) => setPassDate(e.target.value); 
  const handlePreparedByChange = (e: React.ChangeEvent<HTMLInputElement>) => setPreparedBy(e.target.value);
  const handleReceivedByChange = (e: React.ChangeEvent<HTMLInputElement>) => setReceivedBy(e.target.value);
  const handleApprovedByChange = (e: React.ChangeEvent<HTMLInputElement>) => setApprovedBy(e.target.value);

  const handleAddItemRow = () => {
    setItems((prevItems: GatePassItem[]) => [
        ...prevItems, 
        { 
            id: Date.now().toString(), 
            sno: '', 
            itemName: '', description: '', quantity: '', remarks: '' 
        }
    ]);
  };

  const handleRemoveItemRow = (id: string) => {
    setItems((prevItems: GatePassItem[]) => 
        prevItems.filter((item: GatePassItem) => item.id !== id)
    ); 
  };

  const handleItemChange = (id: string, field: keyof GatePassItemPayload, value: string) => {
    setItems((prevItems: GatePassItem[]) =>
      prevItems.map((item: GatePassItem) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const resetForm = () => {
    setRecipientName(initialRecipientName);
    setRecipientAddress(initialRecipientAddress);
    setPassDate(initialPassDate); 
    setItems(initialItems());
    setPreparedBy(getInitialPreparedBy()); 
    setReceivedBy(initialReceivedBy);
    setApprovedBy(initialApprovedBy);
    setError(null);
    setSuccessMessage(null);
    setEditingRecordId(null);
    setIsSavingChanges(false);
  };
  
  const populateFormFields = (data: GatePassResponseData) => {
    setRecipientName(data.recipient_name);
    setRecipientAddress(data.recipient_address);
    setPassDate(data.pass_date);
    const repopulatedItems = data.items.map((item, index) => ({
      ...item,
      id: Date.now().toString() + index,
    }));
    setItems(repopulatedItems);
    setPreparedBy(data.prepared_by);
    setReceivedBy(data.received_by);
    setApprovedBy(data.approved_by);
    setError(null);
    setSuccessMessage(null); // Clear previous messages
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
     if (editingRecordId) {
      setError("Cannot submit new pass while in edit mode. Please save changes or clear form.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    setSubmittedGatePassData(null);
    setShowPrintPreview(false);

    if (!selectedLocation || !selectedLocation.id) {
        setError("No location selected. Please select a location from the dashboard.");
        setIsLoading(false);
        return;
    }
    if (!passDate) {
        setError("Pass Date is required.");
        setIsLoading(false);
        return;
    }

    const itemsPayload: GatePassItemPayload[] = items.map(item => ({
      sno: item.sno,
      itemName: item.itemName,
      description: item.description,
      quantity: item.quantity,
      remarks: item.remarks,
    }));

    const formDataToSubmit = {
      location_id: selectedLocation.id, 
      recipient_name: recipientName,
      recipient_address: recipientAddress,
      pass_date: passDate, 
      items: itemsPayload,
      prepared_by: preparedBy,
      received_by: receivedBy,
      approved_by: approvedBy,
    };

    try {
      const response = await apiService.post<GatePassResponseData>('/gate-passes/', formDataToSubmit);
      if (response) {
        setSuccessMessage('Gate Pass form submitted successfully! Preparing print preview...');
        setSubmittedGatePassData(response); 
        setShowPrintPreview(true);
      } else {
        setError('Form submitted, but no data was returned from the server. Please check or try again.');
        setSubmittedGatePassData(null); 
        setShowPrintPreview(false);
      }
    } catch (err: any) {
      console.error('Gate Pass Form Submission Error:', err);
      setError(getSubmissionErrorMessage(err, 'Failed to submit gate pass form.'));
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSaveChanges = async () => {
    if (!editingRecordId) {
        setError("No record selected for update.");
        return;
    }
    setIsSavingChanges(true);
    setError(null);
    setSuccessMessage(null);

    const itemsPayload: GatePassItemPayload[] = items.map(({ id, ...rest }) => rest);
    const formDataToUpdate = {
      location_id: selectedLocation?.id,
      recipient_name: recipientName,
      recipient_address: recipientAddress,
      pass_date: passDate,
      items: itemsPayload,
      prepared_by: preparedBy,
      received_by: receivedBy,
      approved_by: approvedBy,
    };

    try {
      const response = await apiService.put<GatePassResponseData>(`/gate-passes/${editingRecordId}/`, formDataToUpdate);
      if (response) {
        setSuccessMessage("Gate Pass updated successfully!");
        populateFormFields(response);
        setEditingRecordId(response.id);
      } else {
        setError("Update successful, but no data returned from server.");
      }
    } catch (err: any) {
      console.error('Update Gate Pass Error:', err);
      const errorMessage = err.data?.detail || err.message || 'Failed to update gate pass.';
      setError(errorMessage);
    } finally {
      setIsSavingChanges(false);
    }
  };

  const handlePrintCurrentForm = () => {
    const currentFormData: GatePassResponseData = {
        id: editingRecordId || `preview-${Date.now()}`,
        recipient_name: recipientName,
        recipient_address: recipientAddress,
        pass_date: passDate,
        items: items.map(({ id, ...rest }) => rest),
        prepared_by: preparedBy,
        received_by: receivedBy,
        approved_by: approvedBy,
        location_id: selectedLocation?.id,
    };
    setSubmittedGatePassData(currentFormData);
    setShowPrintPreview(true);
    setSuccessMessage("Displaying print preview for current form data (not saved).");
    setError(null);
  };

  const handleClearAndNewEntry = () => {
    resetForm();
    setSuccessMessage("Form cleared. Ready for new entry.");
  };

  const handlePrint = () => {
    const printWrapper = document.querySelector('.gate-pass-print-preview-wrapper');
    if(printWrapper) {
        document.body.classList.add('printing-now');
        document.body.classList.add('gate-pass-active-print'); 
        printWrapper.classList.add('print-this-section');
    }
    window.print();
    if(printWrapper) {
        printWrapper.classList.remove('print-this-section');
    }
    document.body.classList.remove('gate-pass-active-print');
    document.body.classList.remove('printing-now');
  };

  const handleClosePrintPreview = () => {
    setShowPrintPreview(false);
    setSubmittedGatePassData(null);
    setSuccessMessage(null); 
    setError(null);
  };
  
  const handleEditForm = () => {
    if (submittedGatePassData) {
      populateFormFields(submittedGatePassData);
      setEditingRecordId(submittedGatePassData.id); 
      setShowPrintPreview(false);
      setSubmittedGatePassData(null);
      setError(null);
      setSuccessMessage("Form loaded for editing.");
    }
  };
  
  const handleCreateNewPassFromPreview = () => {
    handleClosePrintPreview();
    resetForm();
    setSuccessMessage("Ready for new gate pass.");
  };


  const fetchPreviousPasses = async (recipientSearch = previousPassesRecipientSearch) => {
    if (!selectedLocation?.id) return;
    setIsLoadingPreviousPasses(true);
    setPreviousPassesError(null);
    try {
      const queryParams = new URLSearchParams();
      const trimmedRecipientSearch = recipientSearch.trim();
      if (trimmedRecipientSearch) {
        queryParams.set('recipient_name', trimmedRecipientSearch);
      }
      const endpoint = queryParams.toString() ? `/gate-passes/?${queryParams.toString()}` : '/gate-passes/';
      const response = await apiService.get<ApiResponse<GatePassResponseData>>(endpoint);
      setPreviousPasses(response?.results || []); 
    } catch (err: any) {
      console.error('Fetch Previous Passes Error:', err);
      setPreviousPassesError(err.message || 'Failed to fetch previous gate passes.');
    } finally {
      setIsLoadingPreviousPasses(false);
    }
  };

  const handleTogglePreviousPassesModal = () => {
    setShowPreviousPassesModal(prev => !prev);
  };

  useEffect(() => {
    if (!showPreviousPassesModal || !selectedLocation?.id) return;

    const timeoutId = window.setTimeout(() => {
      fetchPreviousPasses(previousPassesRecipientSearch);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [showPreviousPassesModal, selectedLocation?.id, previousPassesRecipientSearch]);

  const loadAndShowPass = async (passId: string, actionType: 'View' | 'Reprint') => {
    setActionTypeForLoading(actionType);
    setLoadingActionId(passId);
    setError(null);
    setSuccessMessage(null);
    try {
      const passData = await apiService.get<GatePassResponseData>(`/gate-passes/${passId}/`);
      if (passData) {
        if (actionType === 'View') {
          populateFormFields(passData);
          setEditingRecordId(passData.id); 
          setShowPrintPreview(false);
          setSubmittedGatePassData(null); 
          setSuccessMessage("Gate Pass loaded for viewing/editing.");
        } else { 
          setSubmittedGatePassData(passData);
          setShowPrintPreview(true);
          setSuccessMessage("Gate Pass loaded for reprinting.");
        }
        setShowPreviousPassesModal(false); 
      } else {
        setError(`Failed to load gate pass data for ${actionType.toLowerCase()} (ID: ${passId}). No data returned.`);
        setSubmittedGatePassData(null); 
        setShowPrintPreview(false);
      }
    } catch (err: any) {
      console.error(`${actionType} Gate Pass Error:`, err);
      setError(`Failed to load gate pass for ${actionType.toLowerCase()}: ${err.message || err.data?.detail}`);
    } finally {
      setLoadingActionId(null);
      setActionTypeForLoading(null);
    }
  };
  
  const handleViewPass = (passId: string) => {
    loadAndShowPass(passId, 'View');
  };

  const handleReprintPass = (passId: string) => {
    loadAndShowPass(passId, 'Reprint');
  };
  
  if (showPrintPreview && submittedGatePassData) {
    return (
      <div className="bg-gray-100 py-10 px-4 gate-pass-print-preview-wrapper"> 
        <div className="max-w-4xl mx-auto bg-white p-6 shadow-xl rounded-lg no-print"> 
          <h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">Gate Pass Preview</h2>
          {successMessage && <p className="mb-4 text-center text-green-600 no-print">{successMessage}</p>}
          {error && <p className="mb-4 text-center text-red-600 no-print">{error}</p>}
        </div>

        <div className="print-container-for-two-slips flex flex-col items-center gap-5"> 
            <PrintableGatePass gatePassData={submittedGatePassData} />
            <PrintableGatePass gatePassData={submittedGatePassData} /> 
        </div>

        <div className="mt-8 flex justify-center items-center space-x-4 no-print">
          <Button onClick={handlePrint} className="bg-red-600 hover:bg-red-700 text-white">
            Print Gate Pass (2 Copies)
          </Button>
          <Button onClick={handleEditForm} variant="secondary" className="bg-blue-600 hover:bg-blue-700 text-white">
            Edit Pass
          </Button>
          <Button onClick={handleCreateNewPassFromPreview} variant="secondary">
            Create New Gate Pass
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="relative" 
      style={{ 
        backgroundImage: "url('/images/bgdatacenter.jpeg')", 
        backgroundSize: 'cover', 
        backgroundPosition: 'center', 
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed' 
      }}
    >
      <div className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-lg z-0"></div>
      <div className="relative z-10 min-h-screen text-gray-100 flex flex-col">
        <header className="bg-slate-800 bg-opacity-70 backdrop-blur-md shadow-lg p-4 no-print">
          <div className="container mx-auto flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Button type="button" onClick={() => navigate('/dashboard')} variant="secondary" className="!px-4 !py-2">
                ← Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-red-600">Times Global</h1>
                <p className="text-gray-300">Management Software</p>
              </div>
            </div>
            <Button type="button" onClick={onLogout} variant="secondary">
              Logout
            </Button>
          </div>
        </header>

        <main className="flex-grow container mx-auto p-6 md:p-8 no-print">
          <form onSubmit={handleSubmit} className="bg-slate-700 bg-opacity-60 backdrop-blur-md p-6 md:p-8 rounded-lg shadow-2xl max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-3xl font-semibold text-red-500">
                {editingRecordId ? `Edit Gate Pass` : 'Create Gate Pass'}
                ({selectedLocation?.name || 'No Location Selected'})
              </h2>
              <Button 
                type="button" 
                onClick={handleTogglePreviousPassesModal} 
                variant="secondary" 
                className="bg-teal-600 hover:bg-teal-700"
                disabled={!selectedLocation}
              >
                View / Search Previous Passes
              </Button>
            </div>
            
            {error && <p role="alert" aria-live="assertive" className="mb-4 text-center text-red-300 bg-red-800/50 p-3 rounded whitespace-pre-wrap">{error}</p>}
            {successMessage && !showPrintPreview && <p role="status" aria-live="polite" className="mb-4 text-center text-green-300 bg-green-800/50 p-3 rounded">{successMessage}</p>}
            
            {editingRecordId && <p className="mb-4 text-center text-green-400 bg-green-900/50 p-3 rounded">Form loaded for editing.</p>}


            <section className="mb-8">
              <h3 className="text-xl font-semibold text-red-500 mb-1 border-b-2 border-red-500 pb-2">Recipient Details</h3>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="recipientName" className="block text-sm font-medium text-gray-300 mb-1">MR/MRS.:</label>
                  <Input id="recipientName" name="recipientName" type="text" value={recipientName} onChange={handleRecipientNameChange} placeholder="Recipient's Full Name" required/>
                </div>
                <div>
                  <label htmlFor="passDate" className="block text-sm font-medium text-gray-300 mb-1">PASS DATE:</label>
                  <Input id="passDate" name="passDate" type="date" value={passDate} onChange={handlePassDateChange} required/>
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="recipientAddress" className="block text-sm font-medium text-gray-300 mb-1">ADDRESS:</label>
                  <Input id="recipientAddress" name="recipientAddress" type="text" value={recipientAddress} onChange={handleRecipientAddressChange} placeholder="Recipient's Address" />
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h3 className="text-xl font-semibold text-red-500 mb-1 border-b-2 border-red-500 pb-2">Items Details</h3>
              <div className="mt-4 space-y-4">
                <div className="hidden md:grid grid-cols-[minmax(100px,1fr)_1.5fr_2fr_1fr_1.5fr_auto] gap-2 text-sm font-medium text-gray-300 px-2 py-1 border-b border-gray-700 items-center">
                  <span>S.NO.</span>
                  <span>ITEM</span>
                  <span>DESCRIPTION</span>
                  <span>QUANTITY</span>
                  <span>REMARKS</span>
                  <span className="text-center">ACTION</span>
                </div>
                {items.map((item: GatePassItem) => ( 
                  <div key={item.id} className="grid grid-cols-1 md:grid-cols-[minmax(100px,1fr)_1.5fr_2fr_1fr_1.5fr_auto] gap-3 items-center bg-gray-700/50 p-3 rounded">
                    <Input 
                      aria-label="Serial Number" 
                      type="text" 
                      placeholder="S.No." 
                      value={item.sno} 
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleItemChange(item.id, 'sno', e.target.value)} 
                    />
                    <Input aria-label="Item Name" type="text" placeholder="Item" value={item.itemName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleItemChange(item.id, 'itemName', e.target.value)} required />
                    <Input aria-label="Description" type="text" placeholder="Description" value={item.description} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleItemChange(item.id, 'description', e.target.value)} />
                    <Input aria-label="Quantity" type="text" placeholder="Quantity" value={item.quantity} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleItemChange(item.id, 'quantity', e.target.value)} required />
                    <Input aria-label="Remarks" type="text" placeholder="Remarks" value={item.remarks} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleItemChange(item.id, 'remarks', e.target.value)} />
                    <Button type="button" onClick={() => handleRemoveItemRow(item.id)} className="bg-red-600 hover:bg-red-700 text-white !py-2 w-full md:w-auto" disabled={items.length <= 1}>
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
              <Button type="button" onClick={handleAddItemRow} className="mt-4 bg-red-600 hover:bg-red-700 text-white w-full">
                ADD ITEM ROW
              </Button>
            </section>

            <section className="mb-8">
              <h3 className="text-xl font-semibold text-red-500 mb-1 border-b-2 border-red-500 pb-2">Approval Details</h3>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="preparedBy" className="block text-sm font-medium text-gray-300 mb-1">PREPARED BY:</label>
                  <Input id="preparedBy" name="preparedBy" type="text" value={preparedBy} onChange={handlePreparedByChange} placeholder="Name of preparer" required/>
                </div>
                <div>
                  <label htmlFor="receivedBy" className="block text-sm font-medium text-gray-300 mb-1">RECEIVED BY:</label>
                  <Input id="receivedBy" name="receivedBy" type="text" value={receivedBy} onChange={handleReceivedByChange} placeholder="Name of receiver" />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="approvedBy" className="block text-sm font-medium text-gray-300 mb-1">APPROVED BY:</label>
                  <Input id="approvedBy" name="approvedBy" type="text" value={approvedBy} onChange={handleApprovedByChange} placeholder="Name of approver" required/>
                </div>
              </div>
            </section>

            <div className="mt-10 flex flex-col sm:flex-row justify-center items-center gap-4">
                {editingRecordId ? (
                    <>
                        <Button 
                            type="button" 
                            onClick={handleSaveChanges}
                            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white text-lg px-8 py-3" 
                            disabled={isSavingChanges || !selectedLocation}
                        >
                            {isSavingChanges ? 'Saving...' : 'Save Changes'}
                        </Button>
                        <Button 
                            type="button" 
                            onClick={handlePrintCurrentForm}
                            variant="primary"
                            className="w-full sm:w-auto text-lg px-8 py-3" 
                            disabled={isSavingChanges || isLoading}
                        >
                            Print Current
                        </Button>
                        <Button 
                            type="button" 
                            onClick={handleClearAndNewEntry}
                            variant="secondary"
                            className="w-full sm:w-auto text-lg px-8 py-3" 
                        >
                            Clear / New Entry
                        </Button>
                    </>
                ) : (
                    <Button 
                        type="submit" 
                        className="w-full sm:w-auto bg-red-700 hover:bg-red-800 text-white text-lg px-10 py-3" 
                        disabled={isLoading || !selectedLocation}
                    >
                        {isLoading ? 'Submitting...' : 'SAVE & GENERATE PASS'}
                    </Button>
                )}
            </div>
          </form>
        </main>

        {showPreviousPassesModal && (
          <PreviousRecordsModal
            modalTitle="Previous Gate Passes"
            searchInputLabel="Search by recipient name"
            searchInputId="gatePassRecipientSearch"
            searchValue={previousPassesRecipientSearch}
            onSearchChange={setPreviousPassesRecipientSearch}
            records={previousPasses}
            isLoading={isLoadingPreviousPasses}
            error={previousPassesError}
            emptyMessage={`No previous gate passes found for ${selectedLocation?.name || 'this location'}.`}
            loadingRecordId={loadingActionId}
            actionTypeForLoading={actionTypeForLoading}
            onView={handleViewPass}
            onReprint={handleReprintPass}
            onClose={handleTogglePreviousPassesModal}
            renderRecordDetails={(pass) => (
              <>
                <p className="text-sm text-gray-300">Date: <span className="font-semibold text-gray-100">{formatDateShort(pass.pass_date)}</span></p>
                <p className="text-sm text-gray-300">Recipient: <span className="font-semibold text-gray-100">{pass.recipient_name}</span></p>
              </>
            )}
          />
        )}

        <footer className="bg-slate-800 bg-opacity-70 backdrop-blur-md p-4 text-center text-gray-300 text-sm mt-auto no-print">
          © {new Date().getFullYear()} Times Global Data Centre. All rights reserved.
        </footer>
      </div>
    </div>
  );
};

export default GatePassForm;
