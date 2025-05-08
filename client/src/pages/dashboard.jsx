import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ChatSidebar from '../components/chat/ChatSidebar';
import ChatBox from '../components/chat/ChatBox';
import WelcomeScreen from '../components/chat/WelcomeScreen';
import Navbar from '../components/common/Navbar';

const Dashboard = () => {
  const { user } = useAuth();
  const [selectedChat, setSelectedChat] = useState(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Handle sidebar toggle for mobile
  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  // Close sidebar when chat is selected on mobile
  useEffect(() => {
    if (selectedChat && isMobileSidebarOpen) {
      setIsMobileSidebarOpen(false);
    }
  }, [selectedChat, isMobileSidebarOpen]);

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Navbar toggleSidebar={toggleMobileSidebar} />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <ChatSidebar 
          isOpen={isMobileSidebarOpen}
          onClose={() => setIsMobileSidebarOpen(false)}
          onSelectChat={setSelectedChat}
          selectedChat={selectedChat}
        />
        
        {/* Main chat area */}
        <div className="flex-1 flex flex-col">
          {selectedChat ? (
            <ChatBox chat={selectedChat} />
          ) : (
            <WelcomeScreen username={user?.username} />
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;