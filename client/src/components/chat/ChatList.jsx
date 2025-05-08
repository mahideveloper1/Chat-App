import { useMemo } from 'react';
import moment from 'moment';

const ChatList = ({ chats, selectedChatId, onSelectChat, currentUserId }) => {
  // Function to get chat name for one-on-one chats
  const getChatName = (chat) => {
    // For group chats, use the group name
    if (chat.isGroupChat) {
      return chat.name;
    }
    
    // For one-on-one chats, show the other user's name
    const otherUser = chat.users.find((user) => user._id !== currentUserId);
    return otherUser ? otherUser.username : 'Unknown User';
  };

  // Function to get avatar for chat
  const getChatAvatar = (chat) => {
    // For group chats, return first letter of group name
    if (chat.isGroupChat) {
      return chat.name.charAt(0).toUpperCase();
    }
    
    // For one-on-one chats, return first letter of other user's name
    const otherUser = chat.users.find((user) => user._id !== currentUserId);
    return otherUser ? otherUser.username.charAt(0).toUpperCase() : 'U';
  };

  // Function to get user status for one-on-one chats
  const getChatStatus = (chat) => {
    if (chat.isGroupChat) {
      return null;
    }
    
    const otherUser = chat.users.find((user) => user._id !== currentUserId);
    return otherUser ? otherUser.status : null;
  };

  // Format last message
  const getLastMessagePreview = (chat) => {
    if (!chat.lastMessage) {
      return 'No messages yet';
    }
    
    const sender = chat.lastMessage.sender._id === currentUserId ? 'You: ' : '';
    const content = chat.lastMessage.content;
    
    // Truncate long messages
    return `${sender}${content.length > 30 ? content.substring(0, 30) + '...' : content}`;
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    const messageDate = moment(timestamp);
    const now = moment();
    
    if (now.diff(messageDate, 'days') === 0) {
      // Today, show time
      return messageDate.format('h:mm A');
    } else if (now.diff(messageDate, 'days') === 1) {
      // Yesterday
      return 'Yesterday';
    } else if (now.diff(messageDate, 'days') < 7) {
      // Within last week, show day name
      return messageDate.format('ddd');
    } else {
      // Older, show date
      return messageDate.format('MM/DD/YY');
    }
  };

  const statusColors = {
    online: 'bg-green-500',
    away: 'bg-yellow-500',
    busy: 'bg-red-500',
    offline: 'bg-gray-500',
  };

  // If no chats, show empty state
  if (chats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <svg
          className="w-16 h-16 text-gray-400 mb-2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
        </svg>
        <p className="text-gray-500">No chats yet</p>
        <p className="text-gray-400 text-sm mt-1">
          Search for users to start a conversation
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-gray-200">
      {chats.map((chat) => {
        const chatName = getChatName(chat);
        const chatAvatar = getChatAvatar(chat);
        const chatStatus = getChatStatus(chat);
        const lastMessagePreview = getLastMessagePreview(chat);
        const lastMessageTime = chat.lastMessage 
          ? formatTime(chat.lastMessage.createdAt) 
          : formatTime(chat.updatedAt);
        
        return (
          <li 
            key={chat._id}
            className={`hover:bg-gray-50 cursor-pointer ${
              selectedChatId === chat._id ? 'bg-primary-50' : ''
            }`}
            onClick={() => onSelectChat(chat)}
          >
            <div className="flex px-4 py-3">
              <div className="relative flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold">
                  {chatAvatar}
                </div>
                {chatStatus && (
                  <span 
                    className={`absolute bottom-0 right-0 block h-3 w-3 rounded-full ring-2 ring-white ${statusColors[chatStatus] || 'bg-gray-500'}`}
                  ></span>
                )}
                {chat.isGroupChat && (
                  <div className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-gray-200 ring-2 ring-white flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="ml-3 flex-1 overflow-hidden">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-900 truncate">
                    {chatName}
                  </h3>
                  <span className="text-xs text-gray-500">
                    {lastMessageTime}
                  </span>
                </div>
                <p className="text-sm text-gray-500 truncate">
                  {lastMessagePreview}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
};

export default ChatList;