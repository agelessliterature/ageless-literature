// User & Authentication Types
export interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'customer' | 'vendor' | 'admin';
  profilePictureUrl?: string;
  phoneNumber?: string;
  verifiedEmail: boolean;
  membershipId?: number;
  vendorId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Vendor {
  id: number;
  userId: number;
  businessName: string;
  businessEmail: string;
  businessPhone?: string;
  logoUrl?: string;
  description?: string;
  websiteUrl?: string;
  stripeAccountId?: string;
  commissionRate: number;
  approved: boolean;
  createdAt: string;
  updatedAt: string;
  user?: User;
}

// Book & Catalog Types
export interface Book {
  id: number;
  vendorId: number;
  title: string;
  slug: string;
  author: string;
  isbn?: string;
  publicationYear?: number;
  publisher?: string;
  edition?: string;
  language: string;
  genre?: string;
  condition: 'new' | 'like-new' | 'very-good' | 'good' | 'acceptable';
  description?: string;
  shortDescription?: string;
  price: number;
  compareAtPrice?: number;
  stockQuantity: number;
  reservable: boolean;
  reservationDuration?: number;
  coverImageUrl?: string;
  additionalImages?: string[];
  media?: Array<{
    imageUrl: string;
    thumbnailUrl?: string;
    publicId?: string;
    isPrimary?: boolean;
  }>;
  featured: boolean;
  status: 'active' | 'inactive' | 'archived';
  createdAt: string;
  updatedAt: string;
  vendor?: Vendor;
}

// Lightweight Book type for list views (optimized payload)
export interface BookListItem {
  id: number;
  sid: string;
  slug: string;
  title: string;
  author: string;
  price: number;
  salePrice?: number | null;
  condition: string;
  shortDescription: string;
  primaryImage: string | null;
  hasActiveAuction?: boolean;
  quantity?: number;
  vendor: {
    id: number;
    shopName: string;
    shopUrl: string;
  } | null;
  categories?: Array<{
    id: number;
    name: string;
  }>;
  status: string;
  createdAt: string;
}

// Cart & Order Types
export interface CartItem {
  id: number;
  userId: number;
  bookId: number;
  quantity: number;
  reservationId?: number;
  createdAt: string;
  updatedAt: string;
  book?: Book;
}

export interface Order {
  id: number;
  userId: number;
  orderNumber: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  subtotal: number;
  shippingCost: number;
  tax: number;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  stripePaymentIntentId?: string;
  shippingAddress?: Address;
  billingAddress?: Address;
  trackingNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  items?: OrderItem[];
}

export interface OrderItem {
  id: number;
  orderId: number;
  bookId: number;
  vendorId: number;
  quantity: number;
  price: number;
  totalPrice: number;
  commissionRate: number;
  vendorPayout: number;
  platformFee: number;
  createdAt: string;
  updatedAt: string;
  book?: Book;
}

export interface Address {
  fullName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  stateProvince: string;
  postalCode: string;
  country: string;
  phoneNumber?: string;
}

// Wishlist & Reservation Types
export interface WishlistItem {
  id: number;
  userId: number;
  bookId: number;
  createdAt: string;
  updatedAt: string;
  book?: Book;
}

export interface Reservation {
  id: number;
  userId: number;
  bookId: number;
  expiresAt: string;
  status: 'active' | 'expired' | 'converted' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  book?: Book;
}

// Messaging Types
export interface Message {
  id: number;
  senderId: number;
  recipientId: number;
  content: string;
  read: boolean;
  createdAt: string;
  updatedAt: string;
  sender?: User;
  recipient?: User;
}

export interface MessageThread {
  userId: number;
  user?: User;
  lastMessage?: Message;
  unreadCount: number;
}

// Membership Types
export interface MembershipPlan {
  id: string;
  name: string;
  slug: string;
  description?: string;
  price: number;
  currency: string;
  interval: 'monthly' | 'yearly';
  features: string[];
  isActive: boolean;
  stripePriceId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserMembership {
  id: string;
  userId: number;
  planId: string;
  status: 'active' | 'cancelled' | 'expired' | 'past_due' | 'paused' | 'trialing';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  cancelledAt?: string;
  pausedAt?: string;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  paymentMethodLast4?: string;
  paymentMethodBrand?: string;
  createdAt: string;
  updatedAt: string;
  plan?: MembershipPlan;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
    totalItems: number;
  };
}

// Form Types
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
}

export interface CheckoutFormData {
  shippingAddress: Address;
  billingAddress: Address;
  sameAsShipping: boolean;
  paymentMethod: string;
}

export interface BookFormData {
  title: string;
  author: string;
  isbn?: string;
  publicationYear?: number;
  publisher?: string;
  edition?: string;
  language: string;
  genre?: string;
  condition: string;
  description?: string;
  price: number;
  compareAtPrice?: number;
  stockQuantity: number;
  reservable: boolean;
  reservationDuration?: number;
  coverImageUrl?: string;
}
