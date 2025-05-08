import { Menu } from '@headlessui/react';
import { useAuth } from '../../context/AuthContext';
import { updateUserStatus } from '../../services/socket';

const StatusSelector = () => {
  const { user, updateStatus } = useAuth();

  const statuses = [
    { value: 'online', label: 'Online', color: 'bg-green-500' },
    { value: 'away', label: 'Away', color: 'bg-yellow-500' },
    { value: 'busy', label: 'Busy', color: 'bg-red-500' },
    { value: 'offline', label: 'Appear Offline', color: 'bg-gray-500' },
  ];

  const handleStatusChange = async (status) => {
    try {
      await updateStatus(status);
      // Also update via socket for real-time status change
      updateUserStatus(status);
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const currentStatus = statuses.find((s) => s.value === user?.status) || statuses[0];

  return (
    <>
      {statuses.map((status) => (
        <Menu.Item key={status.value}>
          {({ active }) => (
            <button
              className={`${
                active ? 'bg-gray-100' : ''
              } w-full text-left flex items-center px-4 py-2 text-sm ${
                user?.status === status.value ? 'font-medium' : ''
              }`}
              onClick={() => handleStatusChange(status.value)}
            >
              <span
                className={`inline-block w-3 h-3 rounded-full mr-2 ${status.color}`}
              ></span>
              {status.label}
            </button>
          )}
        </Menu.Item>
      ))}
    </>
  );
};

export default StatusSelector;