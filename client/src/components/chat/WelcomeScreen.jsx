const WelcomeScreen = ({ username }) => {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50 text-center p-4">
        <div className="w-20 h-20 mb-4 bg-primary-100 rounded-full flex items-center justify-center">
          <svg
            className="w-10 h-10 text-primary-600"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          Welcome, {username || 'User'}!
        </h2>
        <p className="text-gray-600 max-w-md">
          Select a chat from the sidebar or search for users to start a new conversation.
        </p>
        <div className="mt-8 space-y-4 max-w-md">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h3 className="font-medium text-gray-800 mb-2 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              How to use the chat app
            </h3>
            <ul className="text-gray-600 text-sm space-y-2 text-left list-disc pl-5">
              <li>Search for users in the sidebar to start a direct chat</li>
              <li>Click the group icon to create a new group chat</li>
              <li>Use emojis and reactions to express yourself</li>
              <li>See when messages are delivered and read</li>
            </ul>
          </div>
        </div>
      </div>
    );
  };
  
  export default WelcomeScreen;