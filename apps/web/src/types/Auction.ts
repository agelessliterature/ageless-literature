import { Book } from './Book';
import { Product } from './Product';

export type AuctionableType = 'book' | 'product';

export type AuctionStatus = 'upcoming' | 'active' | 'ended' | 'sold' | 'cancelled';

export interface Auction {
  id: number;
  auctionableType: AuctionableType;
  auctionableId: string;
  vendorId: number;
  startingPrice: number;
  reservePrice?: number;
  currentBid?: number;
  bidCount?: number;
  startDate: string | Date;
  endDate: string | Date;
  status: AuctionStatus;
  winnerId?: number;
  createdAt: string | Date;
  updatedAt: string | Date;

  // Populated fields
  item?: Book | Product;
  book?: Book; // backward compatibility
  product?: Product;
  vendor?: {
    id: number;
    shopName: string;
    shopUrl: string;
  };
  winner?: {
    id: string;
    name: string;
  };
  bids?: AuctionBid[];
}

export interface AuctionBid {
  id: string;
  auctionId: number;
  userId: string;
  amount: number;
  status: 'active' | 'outbid' | 'winning' | 'won' | 'lost';
  isAutoBid: boolean;
  createdAt: string | Date;
  user?: {
    id: string;
    name: string;
    image?: string;
  };
}

export interface AuctionWin {
  id: string;
  auctionId: number;
  userId: string;
  orderId?: string;
  winningAmount: number;
  paidAt?: string | Date;
  status: 'pending_payment' | 'paid' | 'shipped' | 'completed' | 'cancelled';
  createdAt: string | Date;
  auction?: Auction;
}

export interface CreateAuctionRequest {
  auctionableType: AuctionableType;
  auctionableId: string;
  startingPrice: number;
  reservePrice?: number;
  startDate?: string | Date;
  endDate: string | Date;
}

export interface PlaceBidRequest {
  amount: number;
}

export interface AuctionSummary {
  id: number;
  auctionableType: AuctionableType;
  auctionableId: string;
  startingPrice: number;
  currentBid: number;
  bidCount: number;
  startsAt: string | Date;
  endsAt: string | Date;
  status: AuctionStatus;
  vendor?: {
    id: number;
    shopName: string;
    shopUrl: string;
  };
}
