import React from 'react';
import moment from 'moment';
import Message from './Message';

const MessageList = ({ messages, currentUserId, users }) => {
  // If no messages yet
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-4">
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
        <p className="text-gray-500">No messages yet</p>
        <p className="text-gray-400 text-sm mt-1">
          Be the first to send a message!
        </p>
      </div>
    );
  }

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = moment(message.createdAt).format('YYYY-MM-DD');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {});

  // Get username by ID
  const getUsernameById = (userId) => {
    const user = users.find(user => user._id === userId);
    return user ? user.username : 'Unknown User';
  };

  return (
    <div className="space-y-8">
      {Object.keys(groupedMessages).map((date) => (
        <div key={date}>
          <div className="flex justify-center mb-4">
            <div className="bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full">
              {moment(date).calendar(null, {
                sameDay: '[Today]',
                lastDay: '[Yesterday]',
                lastWeek: 'dddd',
                sameElse: 'MMM D, YYYY'
              })}
            </div>
          </div>
          
          <div className="space-y-3">
            {groupedMessages[date].map((message, index) => {
              const prevMessage = index > 0 ? groupedMessages[date][index - 1] : null;
              const showSender = !prevMessage || prevMessage.sender._id !== message.sender._id;
              
              return (
                <Message
                  key={message._id}
                  message={message}
                  isOwn={message.sender._id === currentUserId}
                  showSender={showSender}
                  senderName={getUsernameById(message.sender._id)}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MessageList;