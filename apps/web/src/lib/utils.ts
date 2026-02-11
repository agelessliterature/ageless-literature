import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/**
 * Map notification type to UI-friendly display information
 * Converts backend notification data to title, message, icon, and link
 */
export function mapNotificationToUI(notification: any): {
  title: string;
  message: string;
  icon: [string, string];
  href: string;
  color: string;
} {
  const { type, data } = notification;

  switch (type) {
    case 'AUCTION_WON_PAYMENT_DUE':
    case 'SMS_AUCTION_WON_PAYMENT_DUE':
      return {
        title: 'You Won an Auction!',
        message: data?.metadata?.productTitle
          ? `Congratulations! You won "${data.metadata.productTitle}". Payment is due.`
          : 'Congratulations! You won an auction. Payment is due.',
        icon: ['fal', 'trophy'] as [string, string],
        href: '/account/winnings',
        color: 'text-yellow-600',
      };

    case 'ORDER_CONFIRMED_BUYER':
      return {
        title: 'Order Confirmed',
        message: data?.metadata?.orderNumber
          ? `Your order #${data.metadata.orderNumber} has been confirmed.`
          : 'Your order has been confirmed.',
        icon: ['fal', 'check-circle'] as [string, string],
        href: data?.entityId ? `/account/orders?highlight=${data.entityId}` : '/account/orders',
        color: 'text-green-600',
      };

    case 'ORDER_NEW_VENDOR':
      return {
        title: 'New Order Received',
        message: data?.metadata?.orderNumber
          ? `New order #${data.metadata.orderNumber} received.`
          : 'You have a new order.',
        icon: ['fal', 'box'] as [string, string],
        href: data?.entityId ? `/vendor/orders?highlight=${data.entityId}` : '/vendor/orders',
        color: 'text-blue-600',
      };

    case 'PAYMENT_FAILED':
    case 'SMS_PAYMENT_FAILED':
      return {
        title: 'Payment Failed',
        message: data?.metadata?.reason
          ? `Payment failed: ${data.metadata.reason}`
          : 'A payment attempt has failed. Please update your payment method.',
        icon: ['fal', 'exclamation-triangle'] as [string, string],
        href: '/account/settings',
        color: 'text-red-600',
      };

    case 'PAYMENT_RECEIVED':
      return {
        title: 'Payment Received',
        message: data?.metadata?.amount
          ? `Payment of ${data.metadata.amount} received.`
          : 'Payment received.',
        icon: ['fal', 'dollar-sign'] as [string, string],
        href: '/vendor/reports',
        color: 'text-green-600',
      };

    case 'MESSAGE_RECEIVED':
      return {
        title: 'New Message',
        message: data?.metadata?.senderName
          ? `New message from ${data.metadata.senderName}`
          : 'You have a new message.',
        icon: ['fal', 'envelope'] as [string, string],
        href: data?.entityId ? `/messages/${data.entityId}` : '/messages',
        color: 'text-purple-600',
      };

    default:
      return {
        title: 'Notification',
        message: 'You have a new notification.',
        icon: ['fal', 'bell'] as [string, string],
        href: '/account/notifications',
        color: 'text-gray-600',
      };
  }
}
