import React, { useEffect } from 'react';

interface CstmNotificationProps {
  message: string;
  type: 'info' | 'success' | 'error';
  onClose: () => void;
}

export const CstmNotification: React.FC <CstmNotificationProps> = ({ message, type, onClose }) => {
  // Auto-dismiss success messages after 3 seconds
  useEffect(() => {
    if (type === 'success') {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [type, onClose, message]);

  const baseStyle = "fixed bottom-4 right-4 z-50 p-4 rounded-lg shadow-lg flex items-center gap-4 text-white transition-opacity duration-300";
  const typeStyles: Record <CstmNotificationProps['type'], string> = {
    success: 'bg-green-500',
    info: 'bg-blue-500',
    error: 'bg-red-500',
  };
  const typeStyle = typeStyles[type];

  return (
    <div className={`${baseStyle} ${typeStyle}`}>
      <span>{message}</span>
      {type === 'info' && (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
      )}
      {type === 'error' && (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      )}
      <button onClick={onClose} className="font-bold text-lg leading-none hover:opacity-75">&times;</button>
    </div>
  );
};