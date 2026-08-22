import React, { useState, useEffect, useContext } from 'react'; 
import { useNavigate } from 'react-router-dom';
import Input from '../common/Input';
import Button from '../common/Button';
import { apiService } from '../../services/apiService';
import PrintableDeviceStorage from './PrintableDeviceStorage'; 
import { LocationContext } from '../LocationContext'; 

interface DeviceStorageFormProps {
  onLogout: () => void;
}

interface StorageItem {
  id: string; 
  sno: string; 
  quantity: string;
  description: string;
  rackNo: string;
  remarks: string;
}

interface StorageItemPayload {
  sno: string;
  quantity: string;
  description: string;
  rackNo: string;
  remarks: string;
}

interface DeviceStorageResponseData {
  id: string;
  company_name: string;
  date: string; 
  office_address: string;
  items: StorageItemPayload[];
  submitter_name: string;
  submitter_company_name: string;
  submitter_designation: string;
  submitter_contact: string;
  submitter_signature: string; 
  prepared_by_signature: string; 
  location_id?: string | number; 
  created_at?: string;
  updated_at?: string;
}

interface ApiResponse<T> {
  results?: T[];
  [key: string]: any;
}


const DeviceStorageForm: React.FC<DeviceStorageFormProps> = ({ onLogout }) => {
  const navigate = useNavigate();
  const { selectedLocation, username } = useContext(LocationContext); 

  const initialCompanyName = 'Times Global';
  const initialDate = new Date().toISOString().split('T')[0];
  const getInitialOfficeAddress = () => selectedLocation ? `Times Global Datacenter, ${selectedLocation.name}` : 'Times Global Datacenter, Main Office';
  const initialItems = (): StorageItem[] => [{ id: Date.now().toString(), sno: '', quantity: '', description: '', rackNo: '', remarks: '' }];

  const [companyName, setCompanyName] = useState<string>(initialCompanyName);
  const [date, setDate] = useState<string>(initialDate); 
  const [officeAddress, setOfficeAddress] = useState<string>(getInitialOfficeAddress());
  
  const [items, setItems] = useState<StorageItem[]>(initialItems());

  const [submitterName, setSubmitterName] = useState<string>('');
  const [submitterCompanyName, setSubmitterCompanyName] = useState<string>('');
  const [submitterDesignation, setSubmitterDesignation] = useState<string>('');
  const [submitterContact, setSubmitterContact] = useState<string>('');
  const [submitterSignature, setSubmitterSignature] = useState<string>(''); 
  const [preparedBySignature, setPreparedBySignature] = useState<string>(username || ''); 
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [submittedDeviceStorageData, setSubmittedDeviceStorageData] = useState<DeviceStorageResponseData | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState<boolean>(false);

  const [showPreviousReceiptsModal, setShowPreviousReceiptsModal] = useState<boolean>(false);
  const [previousReceipts, setPreviousReceipts] = useState<DeviceStorageResponseData[]>([]);
  const [isLoadingPreviousReceipts, setIsLoadingPreviousReceipts] = useState<boolean>(false);
  const [previousReceiptsError, setPreviousReceiptsError] = useState<string | null>(null);
  const [previousReceiptsCompanySearch, setPreviousReceiptsCompanySearch] = useState<string>('');
  
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null); // For View/Reprint loading
  const [actionTypeForLoading, setActionTypeForLoading] = useState<'View' | 'Reprint' | null>(null);

  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [isSavingChanges, setIsSavingChanges] = useState<boolean>(false);


  useEffect(() => {
    setOfficeAddress(getInitialOfficeAddress());
    if (username) {
      setPreparedBySignature(username);
    }
    // If selectedLocation changes and we are NOT in edit mode, reset relevant fields
    if (!editingRecordId) {
        resetForm();
    }
  }, [selectedLocation, username]); // Removed editingRecordId from dependency to avoid re-resetting form while editing


  const handleCompanyNameChange = (e: React.ChangeEvent<HTMLInputElement>) => setCompanyName(e.target.value);
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => setDate(e.target.value);
  const handleOfficeAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => setOfficeAddress(e.target.value);
  const handleSubmitterNameChange = (e: React.ChangeEvent<HTMLInputElement>) => setSubmitterName(e.target.value);
  const handleSubmitterCompanyNameChange = (e: React.ChangeEvent<HTMLInputElement>) => setSubmitterCompanyName(e.target.value);
  const handleSubmitterDesignationChange = (e: React.ChangeEvent<HTMLInputElement>) => setSubmitterDesignation(e.target.value);
  const handleSubmitterContactChange = (e: React.ChangeEvent<HTMLInputElement>) => setSubmitterContact(e.target.value);
  const handleSubmitterSignatureChange = (e: React.ChangeEvent<HTMLInputElement>) => setSubmitterSignature(e.target.value);
  const handlePreparedBySignatureChange = (e: React.ChangeEvent<HTMLInputElement>) => setPreparedBySignature(e.target.value);


  const handleAddItemRow = () => {
    setItems((prevItems: StorageItem[]) => [
        ...prevItems, 
        { id: Date.now().toString(), sno: '', quantity: '', description: '', rackNo: '', remarks: '' } 
    ]);
  };

  const handleRemoveItemRow = (id: string) => {
    setItems((prevItems: StorageItem[]) => 
        prevItems.filter((item: StorageItem) => item.id !== id)
    ); 
  };

  const handleItemChange = (id: string, field: keyof StorageItemPayload, value: string) => {
    setItems((prevItems: StorageItem[]) => 
      prevItems.map((item: StorageItem) => 
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const resetForm = () => {
    setCompanyName(initialCompanyName);
    setDate(initialDate);
    setOfficeAddress(getInitialOfficeAddress());
    setItems(initialItems());
    setSubmitterName('');
    setSubmitterCompanyName('');
    setSubmitterDesignation('');
    setSubmitterContact('');
    setSubmitterSignature('');
    setPreparedBySignature(username || ''); 
    setError(null);
    setSuccessMessage(null);
    setEditingRecordId(null);
    setIsSavingChanges(false);
  };

  const populateFormFields = (data: DeviceStorageResponseData) => {
    setCompanyName(data.company_name);
    setDate(data.date);
    setOfficeAddress(data.office_address);
    const repopulatedItems = data.items.map((item, index) => ({
      ...item,
      id: Date.now().toString() + index,
    }));
    setItems(repopulatedItems);
    setSubmitterName(data.submitter_name);
    setSubmitterCompanyName(data.submitter_company_name);
    setSubmitterDesignation(data.submitter_designation);
    setSubmitterContact(data.submitter_contact);
    setSubmitterSignature(data.submitter_signature);
    setPreparedBySignature(data.prepared_by_signature);
    setError(null);
    setSuccessMessage(null); // Clear previous messages when populating
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (editingRecordId) {
      setError("Cannot submit new entry while in edit mode. Please save changes or clear form.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    setSubmittedDeviceStorageData(null);
    setShowPrintPreview(false);

    if (!selectedLocation || !selectedLocation.id) {
        setError("No location selected. Please select a location from the dashboard.");
        setIsLoading(false);
        return;
    }

    const itemsPayload: StorageItemPayload[] = items.map(({ id, ...rest }) => rest);

    const formDataToSubmit = {
      location_id: selectedLocation.id, 
      company_name: companyName,
      date,
      office_address: officeAddress, 
      items: itemsPayload,
      submitter_name: submitterName,
      submitter_company_name: submitterCompanyName,
      submitter_designation: submitterDesignation,
      submitter_contact: submitterContact,
      submitter_signature: submitterSignature,
      prepared_by_signature: preparedBySignature
    };

    try {
      const response = await apiService.post<DeviceStorageResponseData>('/device-storage/', formDataToSubmit); 
      if (response) {
        setSuccessMessage('Device storage form submitted successfully! Preparing print preview...');
        setSubmittedDeviceStorageData(response);
        setShowPrintPreview(true);
      } else {
        setError('Form submitted, but no data was returned from the server. Please check or try again.');
        setSubmittedDeviceStorageData(null);
        setShowPrintPreview(false);
      }
    } catch (err: any) {
      console.error('Device Storage Form Submission Error:', err);
      const errorMessage = err.data?.detail || err.message || 'Failed to submit device storage form.';
      if (err.status === 500) {
        setError(`Internal Server Error. Please check backend logs. Details: ${errorMessage}`);
      } else if (err.data) { 
        const fieldErrors = Object.entries(err.data).map(([key, value]) => {
            if (key === 'items' && Array.isArray(value)) {
                return value.map((itemError: any, index: number) => 
                    Object.entries(itemError).map(([itemKey, itemValue]) => 
                        `Item ${index+1} ${itemKey}: ${ (Array.isArray(itemValue) ? itemValue.join(', ') : String(itemValue))}`
                    ).join('; ')
                ).join(' | ');
            }
            return `${key}: ${(Array.isArray(value) ? value.join(', ') : String(value))}`;
        }).join(' ');
        setError(fieldErrors || errorMessage);
      }
      else {
        setError(errorMessage);
      }
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

    const itemsPayload: StorageItemPayload[] = items.map(({ id, ...rest }) => rest);
    const formDataToUpdate = {
      location_id: selectedLocation?.id,
      company_name: companyName,
      date,
      office_address: officeAddress,
      items: itemsPayload,
      submitter_name: submitterName,
      submitter_company_name: submitterCompanyName,
      submitter_designation: submitterDesignation,
      submitter_contact: submitterContact,
      submitter_signature: submitterSignature,
      prepared_by_signature: preparedBySignature,
    };

    try {
      const response = await apiService.put<DeviceStorageResponseData>(`/device-storage/${editingRecordId}/`, formDataToUpdate);
      if (response) {
        setSuccessMessage("Receipt updated successfully!");
        populateFormFields(response); 
        setEditingRecordId(response.id); 
      } else {
        setError("Update successful, but no data returned from server.");
      }
    } catch (err: any) {
      console.error('Update Device Storage Error:', err);
      const errorMessage = err.data?.detail || err.message || 'Failed to update receipt.';
      setError(errorMessage);
    } finally {
      setIsSavingChanges(false);
    }
  };
  
  const handlePrintCurrentForm = () => {
    const currentFormData: DeviceStorageResponseData = {
        id: editingRecordId || `preview-${Date.now()}`,
        company_name: companyName,
        date: date,
        office_address: officeAddress,
        items: items.map(({ id, ...rest }) => rest),
        submitter_name: submitterName,
        submitter_company_name: submitterCompanyName,
        submitter_designation: submitterDesignation,
        submitter_contact: submitterContact,
        submitter_signature: submitterSignature,
        prepared_by_signature: preparedBySignature,
        location_id: selectedLocation?.id,
    };
    setSubmittedDeviceStorageData(currentFormData);
    setShowPrintPreview(true);
    setSuccessMessage("Displaying print preview for current form data (not saved).");
    setError(null);
  };

  const handleClearAndNewEntry = () => {
    resetForm();
    setSuccessMessage("Form cleared. Ready for new entry.");
  };


  const handlePrint = () => {
    const printPreviewWrapper = document.querySelector('.device-storage-print-preview-wrapper');
    if (printPreviewWrapper) {
      document.body.classList.add('printing-now');
      document.body.classList.add('device-storage-active-print');
      printPreviewWrapper.classList.add('print-this-section');
    }
    window.print();
    if (printPreviewWrapper) {
      printPreviewWrapper.classList.remove('print-this-section');
    }
    document.body.classList.remove('device-storage-active-print');
    document.body.classList.remove('printing-now');
  };

  const handleClosePrintPreview = () => {
    setShowPrintPreview(false);
    setSubmittedDeviceStorageData(null); 
    setSuccessMessage(null);
    setError(null);
  };

  const handleEditForm = () => {
    if (submittedDeviceStorageData) {
      populateFormFields(submittedDeviceStorageData);
      setEditingRecordId(submittedDeviceStorageData.id);
      setShowPrintPreview(false);
      setSubmittedDeviceStorageData(null);
      setError(null);
      setSuccessMessage("Form loaded for editing."); 
    }
  };
  
  const handleEnterNewStorageFromPreview = () => {
    handleClosePrintPreview();
    resetForm();
    setSuccessMessage("Ready for new storage entry.");
  };


  const fetchPreviousReceipts = async (companySearch = previousReceiptsCompanySearch) => {
    if (!selectedLocation?.id) return;
    setIsLoadingPreviousReceipts(true);
    setPreviousReceiptsError(null);
    try {
      const queryParams = new URLSearchParams();
      const trimmedCompanySearch = companySearch.trim();
      if (trimmedCompanySearch) {
        queryParams.set('company_name', trimmedCompanySearch);
      }
      const endpoint = queryParams.toString() ? `/device-storage/?${queryParams.toString()}` : '/device-storage/';
      const response = await apiService.get<ApiResponse<DeviceStorageResponseData>>(endpoint);
      setPreviousReceipts(response?.results || []);
    } catch (err: any) {
      console.error('Fetch Previous Receipts Error:', err);
      setPreviousReceiptsError(err.message || 'Failed to fetch previous receipts.');
    } finally {
      setIsLoadingPreviousReceipts(false);
    }
  };

  const handleTogglePreviousReceiptsModal = () => {
    setShowPreviousReceiptsModal(prev => !prev);
  };

  useEffect(() => {
    if (!showPreviousReceiptsModal || !selectedLocation?.id) return;

    const timeoutId = window.setTimeout(() => {
      fetchPreviousReceipts(previousReceiptsCompanySearch);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [showPreviousReceiptsModal, selectedLocation?.id, previousReceiptsCompanySearch]);
  
  const loadAndShowReceipt = async (receiptId: string, actionType: 'View' | 'Reprint') => {
    setActionTypeForLoading(actionType);
    setLoadingActionId(receiptId); 
    setError(null); 
    setSuccessMessage(null); 
    try {
      const receiptData = await apiService.get<DeviceStorageResponseData>(`/device-storage/${receiptId}/`);
      if (receiptData) {
        if (actionType === 'View') {
          populateFormFields(receiptData);
          setEditingRecordId(receiptData.id); 
          setShowPrintPreview(false);
          setSubmittedDeviceStorageData(null); 
          setSuccessMessage("Receipt loaded for viewing/editing.");
        } else { 
          setSubmittedDeviceStorageData(receiptData);
          setShowPrintPreview(true);
          setSuccessMessage("Receipt loaded for reprinting.");
        }
        setShowPreviousReceiptsModal(false); 
      } else {
        setError(`Failed to load receipt data for ${actionType.toLowerCase()} (ID: ${receiptId}). No data returned.`);
        setSubmittedDeviceStorageData(null);
        setShowPrintPreview(false);
      }
    } catch (err: any) {
      console.error(`${actionType} Receipt Error:`, err);
      setError(`Failed to load receipt for ${actionType.toLowerCase()}: ${err.message || err.data?.detail}`);
    } finally {
      setLoadingActionId(null);
      setActionTypeForLoading(null);
    }
  };

  const handleViewReceipt = (receiptId: string) => {
    loadAndShowReceipt(receiptId, 'View');
  };
  
  const handleReprintReceipt = (receiptId: string) => {
    loadAndShowReceipt(receiptId, 'Reprint');
  };


  const formatModalDate = (isoDate: string) => {
    try {
      return new Date(isoDate).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric'
      });
    } catch {
      return isoDate;
    }
  };


  if (showPrintPreview && submittedDeviceStorageData) {
    return (
      <div className="bg-gray-100 py-10 px-4 device-storage-print-preview-wrapper"> 
        <div className="max-w-4xl mx-auto bg-white p-6 shadow-xl rounded-lg no-print">
          <h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">Device Storage Receipt Preview</h2>
          {successMessage && <p className="mb-4 text-center text-green-600 no-print">{successMessage}</p>}
           {error && <p className="mb-4 text-center text-red-600 no-print">{error}</p>}
        </div>
        
        <PrintableDeviceStorage storageData={submittedDeviceStorageData} /> 
        
        <div className="mt-8 flex justify-center items-center space-x-4 no-print">
          <Button onClick={handlePrint} className="bg-red-600 hover:bg-red-700 text-white">
            Print Receipt
          </Button>
          <Button onClick={handleEditForm} variant="secondary" className="bg-blue-600 hover:bg-blue-700 text-white">
            Edit Form
          </Button>
          <Button onClick={handleEnterNewStorageFromPreview} variant="secondary">
            Enter New Storage
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
                {editingRecordId ? `Edit Device Storage Receipt` : 'Device Storage Form'} 
                ({selectedLocation?.name || 'No Location Selected'})
              </h2>
              <Button 
                type="button" 
                onClick={handleTogglePreviousReceiptsModal} 
                variant="secondary" 
                className="bg-teal-600 hover:bg-teal-700"
                disabled={!selectedLocation}
              >
                View / Search Previous Receipts
              </Button>
            </div>

            {error && <p role="alert" aria-live="assertive" className="mb-4 text-center text-red-300 bg-red-800/50 p-3 rounded whitespace-pre-wrap">{error}</p>}
            {successMessage && !showPrintPreview && <p role="status" aria-live="polite" className="mb-4 text-center text-green-300 bg-green-800/50 p-3 rounded">{successMessage}</p>}
            
            {editingRecordId && <p className="mb-4 text-center text-green-400 bg-green-900/50 p-3 rounded">Form loaded for editing.</p>}


            <section className="mb-8">
              <h3 className="text-xl font-semibold text-red-500 mb-1 border-b-2 border-red-500 pb-2">Company & Entry Details</h3>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="companyName" className="block text-sm font-medium text-gray-300 mb-1">NAME OF OUR COMPANY:</label>
                  <Input id="companyName" name="companyName" type="text" value={companyName} onChange={handleCompanyNameChange} placeholder="Times Global" />
                </div>
                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-gray-300 mb-1">DATE:</label>
                  <Input id="date" name="date" type="date" value={date} onChange={handleDateChange} placeholder="dd/mm/yyyy" required/>
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="officeAddress" className="block text-sm font-medium text-gray-300 mb-1">REGISTERED OFFICE ADDRESS:</label>
                  <Input id="officeAddress" name="officeAddress" type="text" value={officeAddress} onChange={handleOfficeAddressChange} placeholder="Main Office Address" />
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h3 className="text-xl font-semibold text-red-500 mb-1 border-b-2 border-red-500 pb-2">Items for Storage</h3>
              <div className="mt-4 space-y-4">
                <div className="hidden md:grid grid-cols-[minmax(100px,1fr)_1fr_2fr_1fr_2fr_auto] gap-2 text-sm font-medium text-gray-300 px-2 py-1 border-b border-gray-700 items-center">
                  <span className="text-center">SERIAL NO.</span>
                  <span>QUANTITY</span>
                  <span>ITEM DESCRIPTION</span>
                  <span>RACK NO.</span>
                  <span>REMARKS</span>
                  <span className="text-center">ACTION</span>
                </div>
                {items.map((item: StorageItem) => ( 
                  <div key={item.id} className="grid grid-cols-1 md:grid-cols-[minmax(100px,1fr)_1fr_2fr_1fr_2fr_auto] gap-3 items-center bg-gray-700/50 p-3 rounded">
                    <Input 
                      aria-label="Serial Number" 
                      type="text" 
                      placeholder="Serial No." 
                      value={item.sno} 
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleItemChange(item.id, 'sno', e.target.value)} 
                    />
                    <Input aria-label="Quantity" type="text" placeholder="Quantity" value={item.quantity} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleItemChange(item.id, 'quantity', e.target.value)}  />
                    <Input aria-label="Item Description" type="text" placeholder="Item Description" value={item.description} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleItemChange(item.id, 'description', e.target.value)} required />
                    <Input aria-label="Rack Number" type="text" placeholder="Rack No." value={item.rackNo} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleItemChange(item.id, 'rackNo', e.target.value)}  />
                    <Input aria-label="Remarks" type="text" placeholder="Remarks" value={item.remarks} onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleItemChange(item.id, 'remarks', e.target.value)}  />
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
              <h3 className="text-xl font-semibold text-red-500 mb-1 border-b-2 border-red-500 pb-2">Submitter Information</h3>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label htmlFor="submitterName" className="block text-sm font-medium text-gray-300 mb-1">NAME:</label>
                  <Input id="submitterName" name="submitterName" type="text" value={submitterName} onChange={handleSubmitterNameChange} placeholder="Enter name" required/>
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="submitterCompanyName" className="block text-sm font-medium text-gray-300 mb-1">COMPANY NAME:</label>
                  <Input id="submitterCompanyName" name="submitterCompanyName" type="text" value={submitterCompanyName} onChange={handleSubmitterCompanyNameChange} placeholder="Enter company name"/>
                </div>
                <div>
                  <label htmlFor="submitterDesignation" className="block text-sm font-medium text-gray-300 mb-1">DESIGNATION:</label>
                  <Input id="submitterDesignation" name="submitterDesignation" type="text" value={submitterDesignation} onChange={handleSubmitterDesignationChange} placeholder="Enter designation"/>
                </div>
                <div>
                  <label htmlFor="submitterContact" className="block text-sm font-medium text-gray-300 mb-1">CONTACT NUMBER:</label>
                  <Input id="submitterContact" name="submitterContact" type="text" value={submitterContact} onChange={handleSubmitterContactChange} placeholder="Enter contact number"/>
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="submitterSignature" className="block text-sm font-medium text-gray-300 mb-1">SIGNATURE:</label>
                  <Input id="submitterSignature" name="submitterSignature" type="text" value={submitterSignature} onChange={handleSubmitterSignatureChange} placeholder="Type full name for signature" required/>
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="preparedBySignature" className="block text-sm font-medium text-gray-300 mb-1">PREPARED BY SIGNATURE:</label>
                  <Input id="preparedBySignature" name="preparedBySignature" type="text" value={preparedBySignature} onChange={handlePreparedBySignatureChange} placeholder="Type full name for signature" required/>
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
                  {isLoading ? 'Submitting...' : 'SAVE & GENERATE RECEIPT'}
                </Button>
              )}
            </div>
          </form>
        </main>

        {showPreviousReceiptsModal && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
            onClick={handleTogglePreviousReceiptsModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="previousReceiptsModalTitle"
          >
            <div 
              className="bg-slate-800 bg-opacity-80 backdrop-blur-md p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col"
              onClick={(e) => e.stopPropagation()} 
            >
              <div className="flex justify-between items-center mb-4">
                  <h3 id="previousReceiptsModalTitle" className="text-2xl font-semibold text-red-500">Previous Device Storage Receipts</h3>
                  <Button type="button" onClick={handleTogglePreviousReceiptsModal} variant="secondary" className="!p-2">×</Button>
              </div>
              <div className="mb-4">
                <label htmlFor="deviceStorageCompanySearch" className="block text-sm font-medium text-gray-300 mb-1">Search by company name</label>
                <Input
                  id="deviceStorageCompanySearch"
                  name="deviceStorageCompanySearch"
                  type="search"
                  value={previousReceiptsCompanySearch}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPreviousReceiptsCompanySearch(e.target.value)}
                  placeholder="Search by company name"
                />
              </div>
              {isLoadingPreviousReceipts && previousReceipts.length > 0 && (
                <p className="mb-3 text-center text-xs text-gray-300">Updating results...</p>
              )}
              {previousReceiptsError && <p role="alert" className="text-center text-red-400 bg-red-900/50 p-3 rounded">{previousReceiptsError}</p>}
              {!previousReceiptsError && (
                <div className={`overflow-y-auto flex-grow max-h-[50vh] pr-1 transition-opacity duration-150 ${isLoadingPreviousReceipts && previousReceipts.length > 0 ? 'opacity-70' : 'opacity-100'}`}>
                  {previousReceipts.length === 0 ? (
                    <p className="text-center text-gray-400 py-4">
                      {isLoadingPreviousReceipts ? 'Loading previous receipts...' : `No previous receipts found for ${selectedLocation?.name || 'this location'}.`}
                    </p>
                  ) : (
                    <ul className="space-y-3">
                      {previousReceipts.map((receipt) => (
                        <li key={receipt.id} className="bg-slate-700 bg-opacity-70 backdrop-blur-sm p-4 rounded-md flex justify-between items-center">
                          <div>
                            <p className="text-sm text-gray-300">Company: <span className="font-semibold text-gray-100">{receipt.submitter_company_name || 'N/A'}</span></p>
                            <p className="text-sm text-gray-300">Date: <span className="font-semibold text-gray-100">{formatModalDate(receipt.date)}</span></p>
                            <p className="text-sm text-gray-300">Submitter: <span className="font-semibold text-gray-100">{receipt.submitter_name}</span></p>
                            {receipt.updated_at && <p className="text-xs text-gray-400">Last Updated: {new Date(receipt.updated_at).toLocaleString()}</p>}
                          </div>
                          <div className="flex space-x-2">
                            <Button 
                                type="button"
                                onClick={() => handleViewReceipt(receipt.id)} 
                                className="!px-3 !py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white"
                                disabled={loadingActionId === receipt.id}
                              >
                                {loadingActionId === receipt.id && actionTypeForLoading === 'View' ? 'Loading...' : 'View'}
                            </Button>
                            <Button 
                              type="button"
                              onClick={() => handleReprintReceipt(receipt.id)} 
                              variant="primary" 
                              className="!px-3 !py-1.5 text-sm"
                              disabled={loadingActionId === receipt.id}
                            >
                              {loadingActionId === receipt.id && actionTypeForLoading === 'Reprint' ? 'Loading...' : 'Reprint'}
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              <div className="mt-4 text-right">
                  <Button type="button" onClick={handleTogglePreviousReceiptsModal} variant="secondary">Close</Button>
              </div>
            </div>
          </div>
        )}

        <footer className="bg-slate-800 bg-opacity-70 backdrop-blur-md p-4 text-center text-gray-300 text-sm mt-auto no-print">
          © {new Date().getFullYear()} Times Global Data Centre. All rights reserved.
        </footer>
      </div>
    </div>
  );
};

export default DeviceStorageForm;
