import React, { useState, useCallback, useContext, useEffect } from 'react'; 
import { useLocation, useNavigate } from 'react-router-dom';
import Input from '../common/Input';
import Textarea from '../common/Textarea';
import Button from '../common/Button';
import { apiService } from '../../services/apiService';
import { LocationContext } from '../LocationContext'; 

interface FormData {
  idNumberType: string;
  fullName: string;
  contact: string;
  email: string;
  reason: string;
  approvedBy: string;
  requestedBy: string;
  requestSource: string;
}

interface PreRegisteredUser {
  id: string;
  fullName: string;
  idType: string;
  contact?: string; 
  email?: string;   
  imageFile?: string; 
}

interface AddRecordLocationState {
  registeredUser?: PreRegisteredUser;
}

interface ApiResponse<T> {
  results?: T[];
  [key: string]: any; 
}


const VMSAddRecordPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const locationState = location.state as AddRecordLocationState | null;
  const initialFormData: FormData = {
    idNumberType: '',
    fullName: '',
    contact: '',
    email: '',
    reason: '',
    approvedBy: '',
    requestedBy: '',
    requestSource: '',
  };
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [userLookupError, setUserLookupError] = useState<string | null>(null);
  const [isUserPreRegistered, setIsUserPreRegistered] = useState<boolean | null>(null);
  const [userSuggestions, setUserSuggestions] = useState<PreRegisteredUser[]>([]);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState<boolean>(false);
  const [showUserSuggestions, setShowUserSuggestions] = useState<boolean>(false);

  const { selectedLocation } = useContext(LocationContext); // Get selectedLocation

  const applyRegisteredUserToForm = useCallback((registeredUser: PreRegisteredUser, message?: string) => {
    setFormData((prev: FormData) => ({
      ...prev,
      fullName: registeredUser.fullName || '',
      idNumberType: registeredUser.idType || '',
      contact: registeredUser.contact || '',
      email: registeredUser.email || '',
    }));
    setIsUserPreRegistered(true);
    setUserLookupError(null);
    setUserSuggestions([]);
    setShowUserSuggestions(false);
    if (message) {
      setSuccessMessage(message);
    }
  }, []);

  useEffect(() => {
    const registeredUser = locationState?.registeredUser;

    if (!registeredUser) return;

    applyRegisteredUserToForm(
      registeredUser,
      `Visitor details loaded for ${registeredUser.fullName}. Complete the visit details and check in.`
    );
    navigate(location.pathname, { replace: true, state: null });
  }, [applyRegisteredUserToForm, location.pathname, locationState?.registeredUser, navigate]);

  useEffect(() => {
    const query = formData.fullName.trim();

    if (!query) {
      setUserSuggestions([]);
      setShowUserSuggestions(false);
      setIsSuggestionsLoading(false);
      return;
    }

    if (isUserPreRegistered === true) {
      setIsSuggestionsLoading(false);
      return;
    }

    let isActive = true;
    setIsSuggestionsLoading(true);
    setShowUserSuggestions(true);

    const timeoutId = window.setTimeout(async () => {
      try {
        const data = await apiService.get<PreRegisteredUser[] | ApiResponse<PreRegisteredUser>>(`/images/?search=${encodeURIComponent(query)}`);
        if (!isActive) return;

        const users: PreRegisteredUser[] = Array.isArray(data) ? data : (data?.results || []);
        setUserSuggestions(users);
      } catch (err: any) {
        if (!isActive) return;
        console.error('User suggestion lookup error:', err);
        setUserSuggestions([]);
      } finally {
        if (isActive) {
          setIsSuggestionsLoading(false);
        }
      }
    }, 250);

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, [formData.fullName, isUserPreRegistered]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === "fullName") { 
      setFormData((prev: FormData) => ({
        ...prev,
        fullName: value,
        ...(isUserPreRegistered !== null ? { idNumberType: '', contact: '', email: '' } : {}),
      }));
      setIsUserPreRegistered(null);
      setUserLookupError(null);
      setSuccessMessage(null);
      setShowUserSuggestions(Boolean(value.trim()));
      return;
    }
    setFormData((prev: FormData) => ({ ...prev, [name]: value }));
  };

  const fetchPreRegisteredUserDetails = useCallback(async (name: string) => {
    if (!name.trim()) {
        setIsUserPreRegistered(false); 
        setFormData((prev: FormData) => ({
            ...prev,
            idNumberType: '',
            contact: '',
            email: '',
        }));
        return;
    }
    setUserLookupError(null);
    setIsUserPreRegistered(null); 
    try {
      // Image search endpoint should not be location-scoped by default as images are global
      const data = await apiService.get<PreRegisteredUser[] | ApiResponse<PreRegisteredUser>>(`/images/?search=${encodeURIComponent(name)}`);
      const users: PreRegisteredUser[] = Array.isArray(data) ? data : (data?.results || []);
      
      if (users.length > 0) {
        const foundUser = users[0];
        applyRegisteredUserToForm({ ...foundUser, fullName: name });
      } else {
        setUserLookupError(`User '${name}' not found or not pre-registered. Please register first for auto-filled details, or proceed with manual entry.`);
        setFormData((prev: FormData) => ({
            ...prev,
            idNumberType: '',
            contact: '',
            email: '',
        }));
        setIsUserPreRegistered(false);
      }
    } catch (err: any) {
      console.error('User lookup error:', err);
      setUserLookupError(`Error looking up user: ${err.message}. Proceed with manual entry.`);
      setIsUserPreRegistered(false);
    }
  }, [applyRegisteredUserToForm]);

  const handleFullNameBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const currentFullName = e.target.value;
    window.setTimeout(() => setShowUserSuggestions(false), 150);
    if (isUserPreRegistered === true) {
      return;
    }
    if (currentFullName.trim()) { 
        fetchPreRegisteredUserDetails(currentFullName.trim());
    } else { 
        setIsUserPreRegistered(false);
        setUserLookupError(null);
        setFormData((prev: FormData) => ({
            ...prev,
            idNumberType: '',
            contact: '',
            email: '',
        }));
    }
  };


  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    if (!selectedLocation || !selectedLocation.id) {
        setError("No location selected. Please select a location from the dashboard or location selection page.");
        setIsLoading(false);
        return;
    }

    if (!formData.fullName) {
        setError("Full Name is required to add a record.");
        setIsLoading(false);
        return;
    }
    
    const payload = { 
        ...formData,
        location_id: selectedLocation.id // Include location_id in the payload
    };

    try {
      // apiService will NOT automatically add location_id to POST body, so we added it to payload.
      // It WILL add location_id as query param to /visitors/ endpoint, but backend serializer looks in body.
      await apiService.post('/visitors/', payload);
      setSuccessMessage('New visitor record submitted successfully!');
      setFormData(initialFormData); 
      setIsUserPreRegistered(null);
      setUserLookupError(null);
      setUserSuggestions([]);
      setShowUserSuggestions(false);
    } catch (err: any) {
      console.error('Add Visitor Error:', err);
      if (err.status === 400 && err.data) {
        // Try to parse and display backend validation errors
        const backendErrors = Object.entries(err.data)
          .map(([key, value]) => `${key}: ${(Array.isArray(value) ? value.join(', ') : String(value))}`)
          .join('; ');
        setError(backendErrors || 'Failed to submit new visitor record. Please check your input.');
      } else {
        setError(err.message || err.detail || 'Failed to submit new visitor record.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const inputStyles = "bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400 focus:ring-red-500 focus:border-red-500";
  const labelStyles = "block text-sm font-medium text-gray-300 mb-1";

  return (
    <div className="flex flex-col h-full"> {/* bg-gray-900 removed */}
      <div className="bg-red-700 bg-opacity-75 backdrop-blur-sm text-white p-3 shadow-md">
        <h2 className="text-xl font-semibold text-center">Add New Visitor Record</h2>
      </div>

      <div className="flex-grow p-6 bg-slate-700 bg-opacity-60 backdrop-blur-md rounded-b-lg shadow-inner_lg overflow-y-auto">
        <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl mx-auto">
          {error && <p role="alert" aria-live="assertive" className="mb-4 text-center text-red-300 bg-red-800/70 p-3 rounded">{error}</p>}
          {successMessage && <p role="alert" aria-live="polite" className="mb-4 text-center text-green-300 bg-green-800/70 p-3 rounded">{successMessage}</p>}
          
          <div>
            <label htmlFor="fullName" className={labelStyles}>Full Name:</label>
            <div className="relative">
              <Input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                onFocus={() => {
                  if (formData.fullName.trim() && isUserPreRegistered !== true) {
                    setShowUserSuggestions(true);
                  }
                }}
                onBlur={handleFullNameBlur} 
                className={inputStyles}
                placeholder="Start typing a registered visitor name"
                autoComplete="off"
                required
              />
              {showUserSuggestions && formData.fullName.trim() && (
                <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded-md border border-gray-600 bg-gray-800 shadow-xl">
                  {isSuggestionsLoading ? (
                    <p className="px-3 py-2 text-xs text-yellow-300">Searching registered users...</p>
                  ) : userSuggestions.length > 0 ? (
                    userSuggestions.map((user: PreRegisteredUser) => (
                      <button
                        key={user.id}
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => applyRegisteredUserToForm(user)}
                        className="flex w-full items-center gap-3 border-b border-gray-700 px-3 py-2 text-left text-xs text-gray-100 transition-colors last:border-b-0 hover:bg-red-700 focus:bg-red-700 focus:outline-none"
                      >
                        {user.imageFile ? (
                          <img src={user.imageFile} alt={user.fullName} className="h-8 w-8 shrink-0 rounded-md object-cover" />
                        ) : (
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gray-700 text-[10px] text-gray-300">N/A</span>
                        )}
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">{user.fullName}</span>
                          <span className="block truncate text-gray-300">{user.idType}{user.contact ? ` | ${user.contact}` : ''}</span>
                        </span>
                      </button>
                    ))
                  ) : (
                    <p className="px-3 py-2 text-xs text-gray-300">No registered users found.</p>
                  )}
                </div>
              )}
            </div>
            {isSuggestionsLoading && formData.fullName.trim() && !userLookupError && <p className="text-xs text-yellow-400 mt-1">Looking up user...</p>}
            {userLookupError && <p className="text-xs text-yellow-400 mt-1">{userLookupError}</p>}
            {isUserPreRegistered === true && <p className="text-xs text-green-400 mt-1">User details found and pre-filled where available.</p>}
          </div>

          <div>
            <label htmlFor="idNumberType" className={labelStyles}>ID Number/type:</label>
            <Input
              type="text"
              id="idNumberType"
              name="idNumberType"
              value={formData.idNumberType}
              onChange={handleChange}
              className={inputStyles}
              placeholder="e.g., Citizenship No., Employee ID, Visitor Pass"
            />
          </div>
          
          <div>
            <label htmlFor="contact" className={labelStyles}>Contact:</label>
            <Input
              type="tel"
              id="contact"
              name="contact"
              value={formData.contact}
              onChange={handleChange}
              className={inputStyles}
            />
          </div>
          <div>
            <label htmlFor="email" className={labelStyles}>Email:</label>
            <Input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={inputStyles}
            />
          </div>
          <div>
            <label htmlFor="reason" className={labelStyles}>Reason:</label>
            <Textarea
              id="reason"
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              className={inputStyles + " min-h-[100px]"}
              placeholder="Enter reason for visit"
            />
          </div>
          <div>
            <label htmlFor="approvedBy" className={labelStyles}>Approved By:</label>
            <Input
              type="text"
              id="approvedBy"
              name="approvedBy"
              value={formData.approvedBy}
              onChange={handleChange}
              className={inputStyles}
            />
          </div>
          <div>
            <label htmlFor="requestedBy" className={labelStyles}>Requested By:</label>
            <Input
              type="text"
              id="requestedBy"
              name="requestedBy"
              value={formData.requestedBy}
              onChange={handleChange}
              className={inputStyles}
            />
          </div>
          <div>
            <label htmlFor="requestSource" className={labelStyles}>Request Source:</label>
            <Input
              type="text"
              id="requestSource"
              name="requestSource"
              value={formData.requestSource}
              onChange={handleChange}
              className={inputStyles}
            />
          </div>
          <div className="pt-3">
            <Button type="submit" fullWidth className="bg-red-600 hover:bg-red-700 text-white" disabled={isLoading || !selectedLocation}>
              {isLoading ? 'Checking In...' : 'Check In'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VMSAddRecordPage;
