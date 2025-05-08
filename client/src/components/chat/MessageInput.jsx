import { useState, useRef, useEffect } from 'react';
import EmojiPicker from 'emoji-picker-react';

const MessageInput = ({ onSendMessage, onTyping, typingUsers }) => {
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef(null);
  const inputRef = useRef(null);

  // Handle message input change
  const handleInputChange = (e) => {
    const value = e.target.value;
    setMessage(value);
    
    // Trigger typing indicator
    if (value.trim()) {
      onTyping();
    }
  };

  // Handle message submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!message.trim()) return;
    
    try {
      await onSendMessage(message);
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Handle emoji selection
  const handleEmojiSelect = (emojiData) => {
    setMessage((prevMessage) => prevMessage + emojiData.emoji);
    inputRef.current.focus();
  };

  // Toggle emoji picker
  const toggleEmojiPicker = () => {
    setShowEmojiPicker(!showEmojiPicker);
  };

  // Handle click outside emoji picker
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Render typing indicator
  const renderTypingIndicator = () => {
    if (typingUsers.length === 0) return null;
    
    const typingNames = typingUsers.map(user => user.username);
    let typingText = '';
    
    if (typingUsers.length === 1) {
      typingText = `${typingNames[0]} is typing...`;
    } else if (typingUsers.length === 2) {
      typingText = `${typingNames[0]} and ${typingNames[1]} are typing...`;
    } else {
      typingText = `${typingNames[0]} and ${typingUsers.length - 1} others are typing...`;
    }
    
    return (
      <div className="absolute top-0 left-0 transform -translate-y-full pl-4 pt-1">
        <div className="text-xs text-gray-500 flex items-center">
          <span className="flex space-x-1 mr-1">
            <span className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-pulse"></span>
            <span className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-pulse delay-75"></span>
            <span className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-pulse delay-150"></span>
          </span>
          {typingText}
        </div>
      </div>
    );
  };

  return (
    <div className="relative">
      {/* Typing indicator */}
      {renderTypingIndicator()}
      
      <form onSubmit={handleSubmit} className="flex items-end">
        <div className="relative flex-1">
          {/* Emoji picker toggle */}
          <button
            type="button"
            className="absolute bottom-0 left-0 p-2 text-gray-500 hover:text-gray-700"
            onClick={toggleEmojiPicker}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          
          {/* Message input */}
          <textarea
            ref={inputRef}
            value={message}
            onChange={handleInputChange}
            placeholder="Type a message..."
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-500 focus:ring-opacity-50 pl-10 pr-10 py-3 max-h-20 resize-none"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          
          {/* Emoji picker */}
          {showEmojiPicker && (
            <div ref={emojiPickerRef} className="absolute bottom-full mb-2">
              <EmojiPicker
                onEmojiClick={handleEmojiSelect}
                width={300}
                height={400}
              />
            </div>
          )}
        </div>
        
        {/* Send button */}
        <button
          type="submit"
          className={`ml-2 p-3 rounded-full ${
            message.trim()
              ? 'bg-primary-600 text-white hover:bg-primary-700'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
          disabled={!message.trim()}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
          </svg>
        </button>
      </form>
    </div>
  );
};

export default MessageInput;