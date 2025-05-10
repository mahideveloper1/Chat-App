import { useState, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { userService } from '../../services/api';
import LoadingSpinner from '../common/LoadingSpinner';

const CreateGroupChat = ({ onClose, onCreate, currentUserId }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  // Fetch users on mount
  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults(users);
      return;
    }

    const filtered = users.filter(user => 
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    setSearchResults(filtered);
  }, [searchQuery, users]);

  // Fetch all users
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data } = await userService.getAllUsers();
      // Filter out current user
      const filteredUsers = data.filter(user => user._id !== currentUserId);
      setUsers(filteredUsers);
      setSearchResults(filteredUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const validationSchema = Yup.object({
    name: Yup.string().required('Group name is required').min(3, 'Group name must be at least 3 characters'),
    users: Yup.array().min(2, 'Please select at least 2 users for the group')
  });

  const formik = useFormik({
    initialValues: {
      name: '',
      users: [],
    },
    validationSchema,
    onSubmit: (values) => {
      const userData = {
        name: values.name,
        users: selectedUsers.map(user => user._id)
      };
      
      onCreate(userData);
    },
  });

  // Toggle user selection
  const toggleUserSelection = (user) => {
    if (selectedUsers.some(selectedUser => selectedUser._id === user._id)) {
      setSelectedUsers(selectedUsers.filter(selectedUser => selectedUser._id !== user._id));
      formik.setFieldValue('users', formik.values.users.filter(id => id !== user._id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
      formik.setFieldValue('users', [...formik.values.users, user._id]);
    }
  };

  return (
    <div className="fixed z-50 inset-0 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>
        </div>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Create Group Chat
                </h3>
                
                <form onSubmit={formik.handleSubmit} className="mt-4">
                  {/* Group name input */}
                  <div className="mb-4">
                    <label htmlFor="name" className="form-label">
                      Group Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      className="input"
                      placeholder="Enter group name"
                      value={formik.values.name}
                      onChange={formik.handleChange}
                      onBlur={formik.handleBlur}
                    />
                    {formik.touched.name && formik.errors.name && (
                      <div className="form-error">{formik.errors.name}</div>
                    )}
                  </div>

                  {/* User search input */}
                  <div className="mb-4">
                    <label htmlFor="userSearch" className="form-label">
                      Add Users
                    </label>
                    <input
                      type="text"
                      id="userSearch"
                      className="input"
                      placeholder="Search users by name or email"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>

                  {/* Selected users */}
                  {selectedUsers.length > 0 && (
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-2">
                        {selectedUsers.map(user => (
                          <div 
                            key={user._id} 
                            className="bg-primary-100 text-primary-800 text-sm rounded-full px-3 py-1 flex items-center"
                          >
                            {user.username}
                            <button
                              type="button"
                              className="ml-2 text-primary-600 hover:text-primary-800 focus:outline-none"
                              onClick={() => toggleUserSelection(user)}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {formik.touched.users && formik.errors.users && (
                    <div className="form-error mb-4">{formik.errors.users}</div>
                  )}

                  {/* User list */}
                  <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md">
                    {loading ? (
                      <div className="flex justify-center items-center h-32">
                        <LoadingSpinner />
                      </div>
                    ) : searchResults.length > 0 ? (
                      <ul className="divide-y divide-gray-200">
                        {searchResults.map(user => (
                          <li
                            key={user._id}
                            className={`px-4 py-2 hover:bg-gray-50 cursor-pointer flex items-center ${
                              selectedUsers.some(selectedUser => selectedUser._id === user._id)
                                ? 'bg-gray-50'
                                : ''
                            }`}
                            onClick={() => toggleUserSelection(user)}
                          >
                            <div className="flex-shrink-0">
                              <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700">
                                {user.username.charAt(0).toUpperCase()}
                              </div>
                            </div>
                            <div className="ml-3 flex-1">
                              <p className="text-sm font-medium text-gray-900">{user.username}</p>
                              <p className="text-sm text-gray-500 truncate">{user.email}</p>
                            </div>
                            {selectedUsers.some(selectedUser => selectedUser._id === user._id) && (
                              <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-primary-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="flex justify-center items-center h-32 text-gray-500">
                        No users found
                      </div>
                    )}
                  </div>
                </form>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className="btn btn-primary w-full sm:w-auto sm:ml-3"
              onClick={formik.handleSubmit}
              disabled={formik.isSubmitting || selectedUsers.length < 2}
            >
              {formik.isSubmitting ? <LoadingSpinner size="sm" color="white" /> : 'Create Group'}
            </button>
            <button
              type="button"
              className="btn btn-secondary mt-3 sm:mt-0 w-full sm:w-auto"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupChat;