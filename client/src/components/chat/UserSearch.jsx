import { useState, useEffect, useRef } from 'react';
import LoadingSpinner from '../common/LoadingSpinner';

const UserSearch = ({ onSearch, isSearching, searchResults, onSelectUser, currentUserId }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef(null);

  // Search when query changes
  useEffect(() => {
    const delaySearch = setTimeout(() => {
      if (searchQuery.trim()) {
        onSearch(searchQuery);
      }
    }, 500);

    return () => clearTimeout(delaySearch);
  }, [searchQuery, onSearch]);

  // Handle click outside to close results
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    
    if (value.trim()) {
      setShowResults(true);
    } else {
      setShowResults(false);
    }
  };

  const handleSelectUser = (userId) => {
    onSelectUser(userId);
    setSearchQuery('');
    setShowResults(false);
  };

  return (
    <div className="relative mt-4" ref={searchRef}>
      <div className="relative">
        <input
          type="text"
          placeholder="Search users..."
          className="input pr-10"
          value={searchQuery}
          onChange={handleInputChange}
          onFocus={() => searchQuery.trim() && setShowResults(true)}
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          {isSearching ? (
            <LoadingSpinner size="sm" />
          ) : (
            <svg
              className="h-5 w-5 text-gray-400"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>
      </div>

      {/* Search results */}
      {showResults && searchResults.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md py-1 max-h-60 overflow-auto">
          <ul className="divide-y divide-gray-200">
            {searchResults.map((user) => (
              <li 
                key={user._id}
                className="px-4 py-2 hover:bg-gray-50 cursor-pointer"
                onClick={() => handleSelectUser(user._id)}
              >
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{user.username}</p>
                    <p className="text-sm text-gray-500 truncate">{user.email}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* No results */}
      {showResults && searchQuery.trim() && !isSearching && searchResults.length === 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md py-3 text-center">
          <p className="text-sm text-gray-500">No users found</p>
        </div>
      )}
    </div>
  );
};

export default UserSearch;