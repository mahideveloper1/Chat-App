import { useState, useRef, useEffect } from 'react';
import moment from 'moment';
import { addReactionToMessage } from '../../services/socket';
import EmojiPicker from 'emoji-picker-react';

const Message = ({ message, isOwn, showSender, senderName }) => {
  const [showReactions, setShowReactions] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef(null);

  // Format timestamp
  const formatTime = (timestamp) => {
    return moment(timestamp).format('h:mm A');
  };

  const handleEmojiSelect = (emojiData) => {
    addReactionToMessage(message._id, emojiData.emoji);
    setShowEmojiPicker(false);
  };

  // Toggle emoji picker
  const toggleEmojiPicker = (e) => {
    e.stopPropagation();
    setShowEmojiPicker(!showEmojiPicker);
  };

  const groupedReactions = message.reactions?.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = [];
    }
    acc[reaction.emoji].push(reaction.user);
    return acc;
  }, {}) || {};

  // Check message status
  const hasBeenRead = message.readBy?.length > 0;
  const hasBeenDelivered = message.deliveredTo?.length > 1; 

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

  return (
    <div 
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
      onMouseEnter={() => setShowReactions(true)}
      onMouseLeave={() => setShowReactions(false)}
    >
      <div className={`max-w-[75%] ${isOwn ? 'order-2' : 'order-1'}`}>
        {/* Sender name (only for group chats or first message) */}
        {!isOwn && showSender && (
          <div className="text-xs text-gray-500 mb-1 ml-2">{senderName}</div>
        )}
        
        {/* Message content */}
        <div className="flex items-end group">
          {!isOwn && showSender && (
            <div className="flex-shrink-0 mr-2">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 font-semibold">
                {senderName.charAt(0).toUpperCase()}
              </div>
            </div>
          )}
          
          {/* Message bubble */}
          <div
            className={`relative rounded-lg px-4 py-2 ${
              isOwn 
                ? 'bg-primary-600 text-white rounded-br-none'
                : 'bg-white text-gray-800 rounded-bl-none shadow'
            }`}
          >
            <div>
              {message.content}
            </div>
            
            {/* Message time and status */}
            <div className={`text-right text-xs mt-1 ${isOwn ? 'text-primary-100' : 'text-gray-500'}`}>
              {formatTime(message.createdAt)}
              
              {/* Status indicators (only for own messages) */}
              {isOwn && (
                <span className="ml-1">
                  {hasBeenRead ? (
                    // Double check mark for read
                    <svg className="inline-block h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : hasBeenDelivered ? (
                    // Single check mark for delivered
                    <svg className="inline-block h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : null}
                </span>
              )}
            </div>
            
            {message.isEdited && (
              <div className={`text-right text-xs ${isOwn ? 'text-primary-100' : 'text-gray-500'}`}>
                (edited)
              </div>
            )}
          </div>
          
          {showReactions && (
            <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity relative">
              <button 
                className="p-1 rounded-full bg-white shadow hover:bg-gray-100"
                onClick={toggleEmojiPicker}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-.464 5.535a1 1 0 10-1.415-1.414 3 3 0 01-4.242 0 1 1 0 00-1.415 1.414 5 5 0 007.072 0z" clipRule="evenodd" />
                </svg>
              </button>
              
              {/* Emoji picker */}
              {showEmojiPicker && (
                <div 
                  className="absolute top-0 right-0 mt-8 z-10"
                  ref={emojiPickerRef}
                >
                  <EmojiPicker 
                    onEmojiClick={handleEmojiSelect}
                    width={300}
                    height={350}
                  />
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Message reactions */}
        {Object.keys(groupedReactions).length > 0 && (
          <div className="flex flex-wrap mt-1 ml-10">
            {Object.entries(groupedReactions).map(([emoji, users]) => (
              <div 
                key={emoji} 
                className="bg-gray-100 text-gray-800 text-xs rounded-full px-2 py-1 flex items-center mr-1 mb-1"
                title={`${users.length} ${users.length === 1 ? 'reaction' : 'reactions'}`}
              >
                <span className="mr-1">{emoji}</span>
                <span>{users.length}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Message;