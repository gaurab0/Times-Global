import React, { useState, ChangeEvent, FormEvent, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Input from '../common/Input';
import Button from '../common/Button';
import { apiService } from '../../services/apiService';

interface RegisteredUser { 
  id: string;
  fullName: string;
  imageFile: string; 
  idType: string;
  contact?: string; 
  email?: string;   
}

interface ApiResponse<T> {
  results?: T[];
  [key: string]: any; 
}

const idTypes: string[] = ['Visitor', 'Staff', 'Contractor', 'Other'];

const VMSUserRegistrationPage: React.FC = () => { 
  const navigate = useNavigate();
  const [uploadFullName, setUploadFullName] = useState<string>('');
  const [uploadContact, setUploadContact] = useState<string>(''); 
  const [uploadEmail, setUploadEmail] = useState<string>('');     
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [uploadIdType, setUploadIdType] = useState<string>(idTypes[0]);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]); 
  
  const [isLoading, setIsLoading] = useState<boolean>(false); 
  const [isTableLoading, setIsTableLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null); 
  const [tableError, setTableError] = useState<string | null>(null); 
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [lastRegisteredUser, setLastRegisteredUser] = useState<RegisteredUser | null>(null);

  const [editingUser, setEditingUser] = useState<RegisteredUser | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editFullName, setEditFullName] = useState<string>('');
  const [editContact, setEditContact] = useState<string>('');
  const [editEmail, setEditEmail] = useState<string>('');
  const [editIdType, setEditIdType] = useState<string>(idTypes[0]);
  const [editSelectedFile, setEditSelectedFile] = useState<File | null>(null);
  const [editImagePreviewUrl, setEditImagePreviewUrl] = useState<string | null>(null); 
  const [isUpdatingUser, setIsUpdatingUser] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);


  const handleUploadFullNameChange = (e: React.ChangeEvent<HTMLInputElement>) => setUploadFullName(e.target.value);
  const handleUploadContactChange = (e: React.ChangeEvent<HTMLInputElement>) => setUploadContact(e.target.value);
  const handleUploadEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => setUploadEmail(e.target.value);
  const handleUploadIdTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => setUploadIdType(e.target.value);
  const handleSearchTermChange = (e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value);
  
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.src = 'https://via.placeholder.com/60x60/CCCCCC/FFFFFF?Text=Error';
    e.currentTarget.alt = 'Error loading image';
  };

  const fetchRegisteredUsers = useCallback(async () => {
    setIsTableLoading(true);
    setTableError(null);
    try {
      const queryParams = new URLSearchParams();
      if (searchTerm) queryParams.append('search', searchTerm);
      const data = await apiService.get<RegisteredUser[] | ApiResponse<RegisteredUser>>(`/images/?${queryParams.toString()}`);
      setRegisteredUsers(Array.isArray(data) ? data : (data?.results || []));
    } catch (err: any) {
      console.error('Fetch Registered Users Error:', err);
      setTableError(err.data?.detail || err.message || 'Failed to fetch registered users.');
      setRegisteredUsers([]);
    } finally {
      setIsTableLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    fetchRegisteredUsers();
  }, [fetchRegisteredUsers]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setSelectedFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
    } else {
      setSelectedFile(null);
      setImagePreviewUrl(null);
    }
  };

  const handleRegisterUser = async (e: FormEvent<HTMLFormElement>) => { 
    e.preventDefault();
    if (!uploadFullName || !selectedFile || !uploadIdType || !uploadContact || !uploadEmail) {
      setError('Please fill in all fields (Full Name, Contact, Email, ID Type) and select an image.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    const formData = new FormData();
    formData.append('fullName', uploadFullName);
    formData.append('imageFile', selectedFile); 
    formData.append('idType', uploadIdType);
    formData.append('contact', uploadContact); 
    formData.append('email', uploadEmail);     
    
    try {
      const createdUser = await apiService.post<RegisteredUser>('/images/', formData, true); 
      setSuccessMessage(`User ${uploadFullName} (${uploadIdType}) registered successfully!`);
      if (createdUser) {
        setLastRegisteredUser(createdUser);
      } else {
        setLastRegisteredUser(null);
      }
      fetchRegisteredUsers(); 
      
      setUploadFullName('');
      setUploadContact('');
      setUploadEmail('');
      setSelectedFile(null);
      setImagePreviewUrl(null);
      setUploadIdType(idTypes[0]);
      if (e.target instanceof HTMLFormElement) {
          const fileInput = e.target.querySelector('input[type="file"]') as HTMLInputElement;
          if (fileInput) fileInput.value = "";
      }
    } catch (err: any) {
      console.error('User Registration Error:', err);
      setError(err.data?.detail || err.message || 'Failed to register user.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddVisitorRecord = (user: RegisteredUser) => {
    navigate('/vms/add-record', {
      state: {
        registeredUser: {
          id: user.id,
          fullName: user.fullName,
          idType: user.idType,
          contact: user.contact || '',
          email: user.email || '',
          imageFile: user.imageFile,
        },
      },
    });
  };
  
  const handleSearchSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    fetchRegisteredUsers(); 
  };

  const handleEdit = (user: RegisteredUser) => {
    setEditingUser(user);
    setEditFullName(user.fullName);
    setEditContact(user.contact || '');
    setEditEmail(user.email || '');
    setEditIdType(user.idType);
    setEditImagePreviewUrl(user.imageFile); 
    setEditSelectedFile(null); 
    setEditError(null);
    setIsEditModalOpen(true);
  };

  const handleEditFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setEditSelectedFile(file);
      setEditImagePreviewUrl(URL.createObjectURL(file)); 
    } else {
      setEditSelectedFile(null);
      // If file selection is cancelled, revert to original image of the editing user
      setEditImagePreviewUrl(editingUser ? editingUser.imageFile : null); 
    }
  };

  const handleUpdateUser = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingUser) return;

    if (!editFullName || !editContact || !editEmail || !editIdType) {
        setEditError('Full Name, Contact, Email, and ID Type are required.');
        return;
    }
    setIsUpdatingUser(true);
    setEditError(null);

    const formData = new FormData();
    formData.append('fullName', editFullName);
    formData.append('contact', editContact);
    formData.append('email', editEmail);
    formData.append('idType', editIdType);
    
    if (editSelectedFile) {
      formData.append('imageFile', editSelectedFile);
    }

    try {
      const updatedUserResponse = await apiService.patch<RegisteredUser>(`/images/${editingUser.id}/`, formData, true);
      setRegisteredUsers(prevUsers =>
        prevUsers.map(u => {
          if (u.id === editingUser!.id) {
            // If API returned the full updated object, use it.
            if (updatedUserResponse) {
              return updatedUserResponse;
            } else {
              // If API returned 204 (updatedUserResponse is undefined),
              // construct the new state using submitted form data.
              // For imageFile, if a new one was uploaded but API gave 204,
              // we don't have the new server URL. Safest is to use the old one
              // or expect a list refresh will show the correct one.
              return {
                id: editingUser!.id, // ID is immutable
                fullName: editFullName,
                idType: editIdType,
                contact: editContact || undefined,
                email: editEmail || undefined,
                imageFile: editingUser!.imageFile, // Fallback to original image if API doesn't return one
              };
            }
          }
          return u;
        })
      );
      setIsEditModalOpen(false);
      setEditingUser(null);
      setSuccessMessage(`User ${editFullName} updated successfully!`);
    } catch (err: any) {
      console.error('Update User Error:', err);
      setEditError(err.data?.detail || err.message || 'Failed to update user.');
    } finally {
      setIsUpdatingUser(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this user record?')) {
      try {
        await apiService.delete(`/images/${id}/`); 
        setRegisteredUsers((prev: RegisteredUser[]) => prev.filter((user: RegisteredUser) => user.id !== id));
        setSuccessMessage(`User record ID ${id} deleted successfully.`);
      } catch (err: any) {
        console.error('Delete User Error:', err);
        alert(`Failed to delete user record: ${err.data?.detail || err.message}`);
      }
    }
  };

  const inputDarkStyle = "bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400 focus:ring-red-500 focus:border-red-500 !py-2";
  const labelStyles = "block text-xs font-medium text-gray-300 mb-1";
  const fileInputStyle = "block w-full text-sm text-gray-400 file:mr-2 file:py-1.5 file:px-2 sm:file:mr-3 sm:file:py-2 sm:file:px-3 file:rounded-md file:border file:border-gray-600 file:text-xs sm:file:text-sm file:font-semibold file:bg-red-600 file:text-white hover:file:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent";


  return (
    <div className="flex flex-col h-full">
      <div className="bg-red-700 bg-opacity-75 backdrop-blur-sm text-white p-3 shadow-md">
        <h2 className="text-xl font-semibold text-center">Register User</h2>
      </div>

      <div className="flex-grow p-2 space-y-2 sm:space-y-3 md:space-y-4 overflow-y-auto">
        {successMessage && <p role="alert" aria-live="polite" className="text-center text-green-300 bg-green-800/70 p-2 rounded mb-2">{successMessage}</p>}
        {lastRegisteredUser && (
          <div className="flex justify-center">
            <Button
              type="button"
              onClick={() => handleAddVisitorRecord(lastRegisteredUser)}
              className="bg-blue-600 hover:bg-blue-700 text-white !px-4 !py-2 text-sm"
            >
              Add Visitor Record for {lastRegisteredUser.fullName}
            </Button>
          </div>
        )}
        
        <section className="p-2 sm:p-3 md:p-4 bg-slate-700 bg-opacity-60 backdrop-blur-md rounded-lg shadow border border-gray-700">
          <h3 className="text-lg font-semibold text-red-500 mb-2 sm:mb-3">Add New User/Image</h3>
          {error && <p role="alert" aria-live="assertive" className="text-center text-red-300 bg-red-800/70 p-2 rounded mb-2 sm:mb-3">{error}</p>}
          <form onSubmit={handleRegisterUser} className="space-y-2 sm:space-y-3">
            <div>
              <label htmlFor="uploadFullName" className={labelStyles}>Full Name:</label>
              <Input type="text" id="uploadFullName" value={uploadFullName} onChange={handleUploadFullNameChange} className={inputDarkStyle} placeholder="Enter person's full name" required />
            </div>
            <div> 
              <label htmlFor="uploadContact" className={labelStyles}>Contact:</label>
              <Input type="tel" id="uploadContact" value={uploadContact} onChange={handleUploadContactChange} className={inputDarkStyle} placeholder="Enter contact number" required />
            </div>
            <div> 
              <label htmlFor="uploadEmail" className={labelStyles}>Email:</label>
              <Input type="email" id="uploadEmail" value={uploadEmail} onChange={handleUploadEmailChange} className={inputDarkStyle} placeholder="Enter email address" required />
            </div>
            <div>
              <label htmlFor="uploadIdType" className={labelStyles}>ID Type:</label>
              <select id="uploadIdType" value={uploadIdType} onChange={handleUploadIdTypeChange} className={`${inputDarkStyle} w-full !py-2`}>
                {idTypes.map((type: string) => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>
             <div>
              <label htmlFor="uploadImageFile" className={labelStyles}>Upload Image:</label>
              <input type="file" id="uploadImageFile" accept="image/*" onChange={handleFileChange} className={fileInputStyle} required />
              {imagePreviewUrl && <div className="mt-2 text-center"><img src={imagePreviewUrl} alt="Preview" className="inline-block h-16 w-16 sm:h-20 sm:w-20 object-cover rounded-md border border-gray-600" onError={handleImageError} /></div>}
            </div>
            <Button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white !px-3 !py-2 text-sm" disabled={isLoading}>
              {isLoading ? 'Registering...' : 'Register User'}
            </Button>
          </form>
        </section>

        <section className="p-2 sm:p-3 md:p-4 bg-slate-700 bg-opacity-60 backdrop-blur-md rounded-lg shadow border border-gray-700">
          <h3 className="text-lg font-semibold text-red-500 mb-2 sm:mb-3">Search Registered Users</h3>
          <form onSubmit={handleSearchSubmit} className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2 items-stretch sm:items-center">
            <Input type="text" value={searchTerm} onChange={handleSearchTermChange} className={`${inputDarkStyle} w-full sm:flex-grow`} placeholder="Enter full name to search" />
            <Button type="submit" className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white !px-3 sm:!px-4 !py-2 text-sm" disabled={isTableLoading}>
              {isTableLoading && searchTerm ? 'Searching...' : 'Search'}
            </Button>
          </form>
        </section>

        <section className="bg-slate-700 bg-opacity-60 backdrop-blur-md p-0 rounded-lg shadow border border-gray-700 overflow-hidden mt-8">
          <h3 className="text-lg font-semibold text-gray-100 p-2 sm:p-3 border-b border-gray-700">Registered Users List</h3>
          {tableError && <p role="alert" aria-live="assertive" className="p-3 text-center text-red-400">{tableError}</p>}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-700">
                <tr>
                  {/* ID column header removed */}
                  <th scope="col" className="pl-4 px-1.5 py-1.5 sm:px-2 sm:py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Full Name</th>
                  <th scope="col" className="px-1.5 py-1.5 sm:px-2 sm:py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Image</th>
                  <th scope="col" className="px-1.5 py-1.5 sm:px-2 sm:py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">ID Type</th>
                  <th scope="col" className="px-1.5 py-1.5 sm:px-2 sm:py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Contact</th>
                  <th scope="col" className="px-1.5 py-1.5 sm:px-2 sm:py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Email</th>
                  <th scope="col" className="px-1.5 py-1.5 sm:px-2 sm:py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-gray-800 divide-y divide-gray-700">
                {isTableLoading ? (
                  <tr><td colSpan={6} className="px-3 py-10 text-center text-sm text-gray-400">Loading user data...</td></tr>
                ) : registeredUsers.length > 0 ? registeredUsers.map((user: RegisteredUser) => (
                  <tr key={user.id} className="hover:bg-gray-700/50 transition-colors">
                    {/* ID data cell removed */}
                    <td className="pl-4 px-1.5 py-1.5 sm:px-2 sm:py-2 whitespace-nowrap text-xs font-medium text-gray-100">{user.fullName}</td>
                    <td className="px-1.5 py-1.5 sm:px-2 sm:py-2 whitespace-nowrap">
                      <img src={user.imageFile} alt={user.fullName} className="h-8 w-8 sm:h-10 sm:w-10 object-cover rounded-md" onError={handleImageError}/>
                    </td>
                    <td className="px-1.5 py-1.5 sm:px-2 sm:py-2 whitespace-nowrap text-xs text-gray-300">{user.idType}</td>
                    <td className="px-1.5 py-1.5 sm:px-2 sm:py-2 whitespace-nowrap text-xs text-gray-300">{user.contact || 'N/A'}</td>
                    <td className="px-1.5 py-1.5 sm:px-2 sm:py-2 whitespace-nowrap text-xs text-gray-300">{user.email || 'N/A'}</td>
                    <td className="px-1.5 py-1.5 sm:px-2 sm:py-2 whitespace-nowrap text-xs">
                      <Button onClick={() => handleAddVisitorRecord(user)} className="!px-2 !py-1 text-xs bg-green-600 hover:bg-green-700 text-white mr-1">Add Record</Button>
                      <Button onClick={() => handleEdit(user)} className="!px-2 !py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white mr-1">Edit</Button>
                      <Button onClick={() => handleDelete(user.id)} className="!px-2 !py-1 text-xs bg-red-600 hover:bg-red-700 text-white">Delete</Button>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={6} className="px-3 py-10 text-center text-sm text-gray-400">No users found {searchTerm && 'for the current search'}.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Edit User Modal */}
      {isEditModalOpen && editingUser && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 backdrop-blur-sm flex items-center justify-center p-2 z-50"
          onClick={() => setIsEditModalOpen(false)} 
          role="dialog"
          aria-modal="true"
          aria-labelledby="editUserModalTitle"
        >
          <div 
            className="bg-slate-800 p-2 sm:p-3 md:p-4 rounded-lg shadow-xl w-full max-w-md sm:max-w-lg max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()} 
          >
            <div className="flex justify-between items-center mb-2 sm:mb-3">
              <h3 id="editUserModalTitle" className="text-md sm:text-lg font-semibold text-red-500">
                Edit User: {editingUser.fullName}
              </h3>
              <Button onClick={() => setIsEditModalOpen(false)} variant="secondary" className="!p-1 text-lg sm:text-xl leading-none">&times;</Button>
            </div>
            {editError && <p role="alert" aria-live="assertive" className="text-center text-red-300 bg-red-800/70 p-2 rounded mb-2 sm:mb-3">{editError}</p>}
            <form onSubmit={handleUpdateUser} className="space-y-2 sm:space-y-3 overflow-y-auto flex-grow pr-1">
              <div>
                <label htmlFor="editFullName" className={labelStyles}>Full Name:</label>
                <Input type="text" id="editFullName" value={editFullName} onChange={(e) => setEditFullName(e.target.value)} className={inputDarkStyle} required />
              </div>
              <div>
                <label htmlFor="editContact" className={labelStyles}>Contact:</label>
                <Input type="tel" id="editContact" value={editContact} onChange={(e) => setEditContact(e.target.value)} className={inputDarkStyle} required />
              </div>
              <div>
                <label htmlFor="editEmail" className={labelStyles}>Email:</label>
                <Input type="email" id="editEmail" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className={inputDarkStyle} required />
              </div>
              <div>
                <label htmlFor="editIdType" className={labelStyles}>ID Type:</label>
                <select id="editIdType" value={editIdType} onChange={(e) => setEditIdType(e.target.value)} className={`${inputDarkStyle} w-full !py-2`}>
                  {idTypes.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="editImageFile" className={labelStyles}>Change Image (optional):</label>
                <input type="file" id="editImageFile" accept="image/*" onChange={handleEditFileChange} className={fileInputStyle} />
                {editImagePreviewUrl && (
                  <div className="mt-2 text-center">
                    <p className="text-xs text-gray-400 mb-1">Image Preview:</p>
                    <img src={editImagePreviewUrl} alt="Preview" className="inline-block h-16 w-16 sm:h-20 sm:w-20 object-cover rounded-md border border-gray-600" onError={handleImageError}/>
                  </div>
                )}
              </div>
              <div className="pt-2 flex flex-col sm:flex-row sm:justify-end sm:space-x-2 space-y-2 sm:space-y-0">
                <Button type="button" variant="secondary" onClick={() => setIsEditModalOpen(false)} className="w-full sm:w-auto !px-3 !py-1.5 text-sm">
                  Cancel
                </Button>
                <Button type="submit" className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white !px-3 !py-1.5 text-sm" disabled={isUpdatingUser}>
                  {isUpdatingUser ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default VMSUserRegistrationPage;
