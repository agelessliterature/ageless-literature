import toast from 'react-hot-toast';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';

interface NotificationData {
  title: string;
  message: string;
  href: string;
  icon: any;
  color: string;
}

/**
 * Show a notification popup toast
 * @param notification - Notification data from socket or API
 * @param onNavigate - Callback when user clicks the notification
 */
export const showNotificationToast = (
  notification: NotificationData,
  onNavigate: (href: string) => void,
) => {
  toast.custom(
    (t) => {
      const borderColor =
        notification.color === 'text-green-600'
          ? 'border-green-500'
          : notification.color === 'text-blue-600'
            ? 'border-blue-500'
            : notification.color === 'text-yellow-600'
              ? 'border-yellow-500'
              : notification.color === 'text-red-600'
                ? 'border-red-500'
                : 'border-gray-500';

      return (
        <div
          onClick={() => {
            toast.dismiss(t.id);
            onNavigate(notification.href);
          }}
          className={`${
            t.visible ? 'animate-enter' : 'animate-leave'
          } max-w-md w-full bg-white shadow-2xl rounded-xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 cursor-pointer hover:shadow-2xl transition-all hover:scale-[1.02] border-l-4 ${borderColor}`}
          role="alert"
          aria-live="assertive"
        >
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className={`flex-shrink-0 pt-0.5 ${notification.color}`}>
                <FontAwesomeIcon icon={notification.icon} className="text-2xl" />
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-semibold text-gray-900">{notification.title}</p>
                <p className="mt-1 text-sm text-gray-600 line-clamp-2">{notification.message}</p>
                <p className="mt-1.5 text-xs text-gray-400 flex items-center gap-1">
                  <FontAwesomeIcon icon={['fas', 'mouse-pointer']} className="text-xs" />
                  Click to view details
                </p>
              </div>
            </div>
          </div>
          <div className="flex border-l border-gray-200">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toast.dismiss(t.id);
              }}
              className="w-full border border-transparent rounded-none rounded-r-xl p-4 flex items-center justify-center text-sm font-medium text-gray-400 hover:text-gray-700 hover:bg-gray-50 focus:outline-none transition-colors"
              aria-label="Dismiss notification"
            >
              <FontAwesomeIcon icon={['fal', 'times']} className="text-lg" />
            </button>
          </div>
        </div>
      );
    },
    {
      duration: 8000, // 8 seconds
      position: 'top-right',
      id: `notification-${Date.now()}`, // Prevent duplicate toasts
    },
  );
};

/**
 * Play notification sound (optional)
 */
export const playNotificationSound = () => {
  // Check if user has enabled sound in their browser
  if (typeof Audio !== 'undefined') {
    try {
      // Use a subtle notification sound
      const audio = new Audio('/sounds/notification.mp3');
      audio.volume = 0.3; // 30% volume
      audio.play().catch(() => {
        // Silently fail if sound can't play (blocked by browser)
      });
    } catch (error) {
      // Ignore errors
    }
  }
};
