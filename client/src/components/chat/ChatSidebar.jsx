import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { chatService, userService } from '../../services/api';
import ChatList from './ChatList';
import UserSearch from './UserSearch';
import CreateGroupChat from './CreateGroupChat';
import LoadingSpinner from '../common/LoadingSpinner';

const ChatSidebar = ({ isOpen, onClose, onSelectChat, selectedChat }) => {
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Fetch chats on mount
  useEffect(() => {
    fetchChats();
  }, []);

  // Fetch all chats for the user
  const fetchChats = async () => {
    setLoading(true);
    try {
      const { data } = await chatService.getAllChats();
      // Sort chats by most recent message
      const sortedChats = data.sort((a, b) => {
        const aDate = a.lastMessage ? new Date(a.lastMessage.createdAt) : new Date(a.updatedAt);
        const bDate = b.lastMessage ? new Date(b.lastMessage.createdAt) : new Date(b.updatedAt);
        return bDate - aDate;
      });
      setChats(sortedChats);
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle user search
  const handleSearch = async (query) => {
    if (query.trim() === '') {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const { data } = await userService.getAllUsers(query);
      setSearchResults(data);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setIsSearching(false);
    }
  };

  // Create or access one-to-one chat
  const accessChat = async (userId) => {
    try {
      const { data } = await chatService.createDirectChat(userId);
      
      // Check if chat already exists in state
      if (!chats.find((c) => c._id === data._id)) {
        setChats((prevChats) => [data, ...prevChats]);
      }
      
      onSelectChat(data);
      setSearchResults([]);
    } catch (error) {
      console.error('Error accessing chat:', error);
    }
  };

  // Create a new group chat
  const createGroupChat = async (groupData) => {
    try {
      const { data } = await chatService.createGroupChat(groupData);
      setChats((prevChats) => [data, ...prevChats]);
      onSelectChat(data);
      setIsCreatingGroup(false);
    } catch (error) {
      console.error('Error creating group chat:', error);
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 z-20 bg-gray-600 bg-opacity-75 transition-opacity" 
          onClick={onClose}
        ></div>
      )}

      {/* Sidebar */}
      <div 
        className={`${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 fixed md:relative inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out overflow-hidden flex flex-col`}
      >
        {/* Sidebar header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Chats</h2>
            <div className="flex space-x-2">
              <button
                onClick={() => setIsCreatingGroup(true)}
                className="p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                title="Create group chat"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                </svg>
              </button>
              <button
                onClick={onClose}
                className="md:hidden p-2 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                title="Close sidebar"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>

          {/* Search input */}
          <UserSearch 
            onSearch={handleSearch} 
            isSearching={isSearching}
            searchResults={searchResults}
            onSelectUser={accessChat}
            currentUserId={user?._id}
          />
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <LoadingSpinner />
            </div>
          ) : (
            <ChatList
              chats={chats}
              selectedChatId={selectedChat?._id}
              onSelectChat={onSelectChat}
              currentUserId={user?._id}
            />
          )}
        </div>
      </div>

      {/* Create Group Chat Modal */}
      {isCreatingGroup && (
        <CreateGroupChat
          onClose={() => setIsCreatingGroup(false)}
          onCreate={createGroupChat}
          currentUserId={user?._id}
        />
      )}
    </>
  );
};

export default ChatSidebar;