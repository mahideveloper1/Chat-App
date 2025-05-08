import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { messageService } from '../../services/api';
import { 
  joinChat, 
  leaveChat, 
  sendMessage as emitMessage,
  sendTyping,
  sendStopTyping,
  onMessageReceived,
  onTyping,
  onStopTyping
} from '../../services/socket';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import ChatHeader from './ChatHeader';
import LoadingSpinner from '../common/LoadingSpinner';

const ChatBox = ({ chat }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 1,
  });
  const messageEndRef = useRef(null);
  const throttleTypingRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Join chat on mount and leave on unmount
  useEffect(() => {
    joinChat(chat._id);
    
    return () => {
      leaveChat(chat._id);
    };
  }, [chat._id]);

  // Fetch messages when chat changes
  useEffect(() => {
    fetchMessages();
  }, [chat._id]);

  // Set up socket listeners
  useEffect(() => {
    // Listen for new messages
    const messageHandler = (message) => {
      if (message.chat._id === chat._id) {
        setMessages((prevMessages) => [...prevMessages, message]);
      }
    };

    // Listen for typing indicators
    const typingHandler = ({ userId, chatId }) => {
      if (userId !== user._id && chatId === chat._id) {
        const username = getChatUserById(userId)?.username || 'Someone';
        
        setTypingUsers((prev) => {
          if (!prev.some((user) => user.userId === userId)) {
            return [...prev, { userId, username }];
          }
          return prev;
        });
      }
    };

    // Listen for stop typing
    const stopTypingHandler = ({ userId, chatId }) => {
      if (chatId === chat._id) {
        setTypingUsers((prev) => prev.filter((user) => user.userId !== userId));
      }
    };

    // Set up listeners
    onMessageReceived(messageHandler);
    onTyping(typingHandler);
    onStopTyping(stopTypingHandler);

    // Clean up
    return () => {
      // Clean up typing timeouts
      if (throttleTypingRef.current) {
        clearTimeout(throttleTypingRef.current);
      }
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [chat._id, user._id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Get user from chat by id
  const getChatUserById = (userId) => {
    return chat.users.find((u) => u._id === userId);
  };

  // Fetch messages
  const fetchMessages = async (page = 1) => {
    setLoading(true);
    
    try {
      const { data } = await messageService.getChatMessages(chat._id, page);
      setMessages(data.messages);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load more messages (pagination)
  const loadMoreMessages = async () => {
    if (pagination.page >= pagination.pages) return;
    
    try {
      const nextPage = pagination.page + 1;
      const { data } = await messageService.getChatMessages(chat._id, nextPage);
      
      // Prepend older messages
      setMessages((prevMessages) => [...data.messages, ...prevMessages]);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error loading more messages:', error);
    }
  };

  // Send message
  const sendMessage = async (content) => {
    if (!content.trim()) return;
    
    try {
      // Send via REST API
      const { data } = await messageService.sendMessage({
        content,
        chatId: chat._id,
      });
      
      // Also emit via socket for real-time
      emitMessage({
        content,
        chatId: chat._id,
      });
      
      // Stop typing indicator
      sendStopTyping(chat._id);
      
      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  // Handle typing
  const handleTyping = () => {
    // Don't send typing event if already throttled
    if (throttleTypingRef.current) return;
    
    // Send typing event
    sendTyping(chat._id);
    
    // Throttle typing event
    throttleTypingRef.current = setTimeout(() => {
      throttleTypingRef.current = null;
    }, 3000);
    
    // Set timeout to stop typing
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      sendStopTyping(chat._id);
    }, 5000);
  };

  // Get chat name
  const getChatName = () => {
    if (chat.isGroupChat) {
      return chat.name;
    }
    
    const otherUser = chat.users.find((u) => u._id !== user._id);
    return otherUser ? otherUser.username : 'Chat';
  };

  // Get users for display in header
  const getChatUsers = () => {
    if (chat.isGroupChat) {
      return chat.users;
    }
    
    return chat.users.filter((u) => u._id !== user._id);
  };

  return (
    <div className="flex flex-col h-full">
      <ChatHeader
        name={getChatName()}
        users={getChatUsers()}
        isGroupChat={chat.isGroupChat}
        admin={chat.admin}
      />
      
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            {pagination.page < pagination.pages && (
              <div className="flex justify-center mb-4">
                <button
                  onClick={loadMoreMessages}
                  className="text-sm text-primary-600 hover:text-primary-800 focus:outline-none"
                >
                  Load more messages
                </button>
              </div>
            )}
            
            <MessageList
              messages={messages}
              currentUserId={user._id}
              users={chat.users}
            />
            
            <div ref={messageEndRef} />
          </>
        )}
      </div>
      
      <div className="p-4 border-t border-gray-200 bg-white">
        <MessageInput
          onSendMessage={sendMessage}
          onTyping={handleTyping}
          typingUsers={typingUsers}
        />
      </div>
    </div>
  );
};

export default ChatBox;