import React, { useEffect } from 'react';

interface CstmNotificationProps {
  message: string;
  type: 'info' | 'success' | 'error';
  onClose: () => void;
}

export const CstmNotification: React.FC<CstmNotificationProps> = ({ message, type, onClose }) => {
  // Auto-dismiss success and info messages after 4 seconds
  useEffect(() => {
    if (type === 'success' || type === 'info') {
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [type, onClose, message]);

  const config = {
    success: {
      bg: 'bg-gradient-to-r from-green-600 to-emerald-600',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      ),
    },
    info: {
      bg: 'bg-gradient-to-r from-blue-600 to-cyan-600',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      ),
    },
    error: {
      bg: 'bg-gradient-to-r from-red-600 to-rose-600',
      icon: (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      ),
    },
  };

  const { bg, icon } = config[type];

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-slideIn max-w-md">
      <div className={`${bg} rounded-lg shadow-2xl border border-white/20 overflow-hidden`}>
        <div className="p-4 flex items-start gap-3">
          <div className="shrink-0 text-white">
            {icon}
          </div>
          <div className="flex-1 text-white">
            <p className="text-sm font-medium leading-relaxed">
              {message}
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 text-white/80 hover:text-white transition-colors focus:outline-none"
            aria-label="Cerrar notificación"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress Bar for Auto-dismiss */}
        {(type === 'success' || type === 'info') && (
          <div className="h-1 bg-white/20">
            <div
              className="h-full bg-white/60 animate-shrink"
              style={{ animation: 'shrink 4s linear forwards' }}
            />
          </div>
        )}
      </div>
    </div>
  );
};