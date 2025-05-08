import { useState } from 'react';
import { Menu, Transition } from '@headlessui/react';

const ChatHeader = ({ name, users, isGroupChat, admin }) => {
  const [showUserInfo, setShowUserInfo] = useState(false);
  
  const statusColors = {
    online: 'bg-green-500',
    away: 'bg-yellow-500',
    busy: 'bg-red-500',
    offline: 'bg-gray-500',
  };
  
  // Get status dot for one-on-one chats
  const renderStatusDot = () => {
    if (isGroupChat || users.length === 0) return null;
    
    const otherUser = users[0];
    const status = otherUser.status || 'offline';
    
    return (
      <span 
        className={`inline-block w-2.5 h-2.5 rounded-full ${statusColors[status]} ml-2`}
        title={`${otherUser.username} is ${status}`}
      ></span>
    );
  };
  
  const toggleUserInfo = () => {
    setShowUserInfo(!showUserInfo);
  };

  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="flex justify-between items-center p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            {isGroupChat ? (
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary-700" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                </svg>
              </div>
            ) : (
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-semibold">
                {name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              {name}
              {renderStatusDot()}
            </h3>
            <p className="text-sm text-gray-500">
              {isGroupChat 
                ? `${users.length} members` 
                : users.length > 0 ? users[0].email : ''}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            className="p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none"
            onClick={toggleUserInfo}
            title="Chat info"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </button>
          
          <Menu as="div" className="relative">
            <Menu.Button className="p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </Menu.Button>
            <Transition
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                <div className="py-1">
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        className={`${
                          active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                        } w-full text-left block px-4 py-2 text-sm`}
                        onClick={toggleUserInfo}
                      >
                        Chat Information
                      </button>
                    )}
                  </Menu.Item>
                  {isGroupChat && (
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          className={`${
                            active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                          } w-full text-left block px-4 py-2 text-sm`}
                        >
                          Edit Group
                        </button>
                      )}
                    </Menu.Item>
                  )}
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        className={`${
                          active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                        } w-full text-left block px-4 py-2 text-sm`}
                      >
                        Clear Chat
                      </button>
                    )}
                  </Menu.Item>
                </div>
              </Menu.Items>
            </Transition>
          </Menu>
        </div>
      </div>
      
      {/* User info sidebar */}
      {showUserInfo && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-medium text-gray-900">{isGroupChat ? 'Group Members' : 'Contact Info'}</h4>
            <button
              className="p-1 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-200 focus:outline-none"
              onClick={toggleUserInfo}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          
          <ul className="divide-y divide-gray-200">
            {users.map((user) => (
              <li key={user._id} className="py-2 flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-semibold">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div className="ml-3 flex-1">
                  <div className="flex items-center">
                    <p className="text-sm font-medium text-gray-900">{user.username}</p>
                    <span className={`ml-2 w-2 h-2 rounded-full ${statusColors[user.status || 'offline']}`}></span>
                    {isGroupChat && admin && user._id === admin._id && (
                      <span className="ml-2 text-xs text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded">
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ChatHeader;