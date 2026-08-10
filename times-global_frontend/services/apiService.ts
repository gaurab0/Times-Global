import { getAuthToken, setAuthToken, getRefreshToken, removeAuthToken } from './tokenService';
import { LocationInfo } from '../components/LocationContext'; // Import LocationInfo

const BASE_URL = 'http://111.119.60.23/api'; 

interface ApiErrorData {
  detail?: string;
  code?: string;
  [key: string]: any; 
}

class ApiError extends Error {
  data?: ApiErrorData;
  status?: number;

  constructor(message: string, data?: ApiErrorData, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.data = data;
    this.status = status;
  }
}

let isRefreshing = false;
let failedQueue: Array<{resolve: (value?: any) => void, reject: (reason?: any) => void}> = [];

const processFailedQueue = (error: any /* token parameter removed as it's unused */) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      // Resolve without arguments, the makeRequest will re-fetch the token
      prom.resolve(); 
    }
  });
  failedQueue = [];
};

async function handleRefreshToken(): Promise<boolean> {
  isRefreshing = true;
  const currentRefreshToken = getRefreshToken();
  if (!currentRefreshToken) {
    removeAuthToken(); 
    isRefreshing = false;
    processFailedQueue(new ApiError("Session expired. No refresh token available.", undefined, 401));
    window.dispatchEvent(new CustomEvent('auth-failure')); 
    return false;
  }

  try {
    const response = await fetch(`${BASE_URL}/auth/token/refresh/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh: currentRefreshToken }),
    });

    const responseData = await response.json();

    if (!response.ok) {
      removeAuthToken(); 
      window.dispatchEvent(new CustomEvent('auth-failure'));
      throw new ApiError(
        responseData.detail || 'Session expired. Please log in again.', 
        responseData, 
        response.status
      );
    }

    if (responseData.access) {
      setAuthToken(responseData.access);
      // Pass null for error to indicate success, makeRequest will pick up new token
      processFailedQueue(null); 
      return true;
    } else {
      removeAuthToken(); 
      window.dispatchEvent(new CustomEvent('auth-failure'));
      throw new ApiError('Failed to refresh session: No new access token received.', responseData, response.status);
    }
  } catch (error) {
    removeAuthToken(); 
    window.dispatchEvent(new CustomEvent('auth-failure'));
    processFailedQueue(error); // Pass the caught error
    return false;
  } finally {
    isRefreshing = false;
  }
}

// Helper to determine if an endpoint needs location scoping for GET requests
const endpointsRequiringLocationForGET = [
  '/visitors/',
  '/task-management/tasks/',
  '/device-storage/',
  '/gate-passes/',
  // Add other base GET endpoints that need location_id
];

const endpointNeedsLocationForGET = (endpoint: string): boolean => {
  // Check if the endpoint starts with any of the defined base paths
  return endpointsRequiringLocationForGET.some(base => endpoint.startsWith(base));
};


async function request<T>(endpoint: string, options: RequestInit = {}, isFormData: boolean = false, isRetry: boolean = false): Promise<T | undefined> {
  let modifiedEndpoint = endpoint;
  
  // Append location_id as a query parameter for specific GET requests if location is selected
  if (options.method === 'GET' || !options.method) { // Default to GET if method is not specified
    if (endpointNeedsLocationForGET(endpoint)) {
      const storedSelectedLocation = localStorage.getItem('selectedLocation');
      if (storedSelectedLocation) {
        try {
          const locationInfo: LocationInfo = JSON.parse(storedSelectedLocation);
          if (locationInfo && locationInfo.id) {
            const separator = modifiedEndpoint.includes('?') ? '&' : '?';
            modifiedEndpoint = `${modifiedEndpoint}${separator}location_id=${locationInfo.id}`;
            // console.log("apiService GET request with location_id:", `${BASE_URL}${modifiedEndpoint}`);
          }
        } catch (e) {
          console.error("Error parsing selectedLocation from localStorage for API GET request:", e);
        }
      }
    }
  }
  // For POST/PUT/PATCH, location_id should be included in the body by the component making the call, if required by backend.
  // console.log("apiService request to:", `${BASE_URL}${modifiedEndpoint}`, "Method:", options.method);


  const url = `${BASE_URL}${modifiedEndpoint}`;
  
  const makeRequest = async (token: string | null): Promise<T | undefined> => {
    const headers = new Headers(options.headers || {}); 

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    if (!isFormData && options.body && (typeof options.body === 'string' || !(options.body instanceof FormData)) ) { 
      if (!(options.body instanceof FormData)) { 
         headers.set('Content-Type', 'application/json');
      }
    }

    const config: RequestInit = {
      ...options,
      headers, 
    };

    const response = await fetch(url, config);

    if (!response.ok) {
      let errorData: ApiErrorData = { detail: response.statusText || 'Unknown server error' };
      try {
        errorData = await response.json();
      } catch (e) {
        // Keep default errorData if parsing fails
      }
      
      if (response.status === 401 && !isRetry && !url.includes('/auth/token/refresh/')) {
        if (isRefreshing) {
          return new Promise((resolve, reject) => {
            failedQueue.push({ resolve: () => resolve(makeRequest(getAuthToken())), reject });
          });
        } else {
          const refreshSuccessful = await handleRefreshToken();
          if (refreshSuccessful) {
            return makeRequest(getAuthToken()); // Retry with the new token
          } else {
             throw new ApiError(
                errorData.detail || 'Session expired. Please log in again.',
                errorData,
                401 
             );
          }
        }
      }
      throw new ApiError(
        errorData.detail || `HTTP error! status: ${response.status}`, 
        errorData,
        response.status
      );
    }
    
    if (response.status === 204 || response.headers.get("content-length") === "0") {
        return undefined; 
    }
    return await response.json() as T;
  };

  return makeRequest(getAuthToken());
}

export const apiService = {
  get: <T>(endpoint: string, options?: RequestInit): Promise<T | undefined> => 
    request<T>(endpoint, { ...options, method: 'GET' }),
  post: <T>(endpoint: string, body: any, isFormData: boolean = false, options?: RequestInit): Promise<T | undefined> => 
    request<T>(endpoint, { ...options, method: 'POST', body: isFormData ? body : JSON.stringify(body) }, isFormData),
  put: <T>(endpoint: string, body: any, isFormData: boolean = false, options?: RequestInit): Promise<T | undefined> => 
    request<T>(endpoint, { ...options, method: 'PUT', body: isFormData ? body : JSON.stringify(body) }, isFormData),
  patch: <T>(endpoint: string, body: any, isFormData: boolean = false, options?: RequestInit): Promise<T | undefined> => 
    request<T>(endpoint, { ...options, method: 'PATCH', body: isFormData ? body : JSON.stringify(body) }, isFormData),
  delete: <T>(endpoint: string, options?: RequestInit): Promise<T | undefined> => 
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};

window.addEventListener('auth-failure', () => {
  if (window.location.hash !== '#/login' && window.location.hash !== '#/register') {
    window.location.hash = '#/login';
  }
});
