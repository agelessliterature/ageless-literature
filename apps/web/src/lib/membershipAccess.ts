/**
 * Membership Access Control Utilities
 * Helper functions to check user membership status and feature access
 */

export type MembershipTier = 'none' | 'silver' | 'gold' | 'platinum';

export interface MembershipFeatures {
  // Auction Features
  auctionBidsPerMonth: number | 'unlimited';
  auctionFeeDiscount: number; // percentage 0-100
  earlyAuctionAccess: boolean; // 24 hours early

  // Content Features
  masterClass: boolean;
  aiResearchTool: boolean;
  aiAuthenticationDiscount: number; // percentage
  valueCharts: boolean;

  // Collection Features
  myCollection: boolean;
  privateBookRequests: number | 'unlimited';
  privateOfferSubmissions: number | 'unlimited';
  socialPosting: number | 'unlimited';

  // Premium Features
  conciergeService: boolean;
  noFeesWithConcierge: boolean;
}

/**
 * Feature sets by membership tier
 */
const TIER_FEATURES: Record<MembershipTier, MembershipFeatures> = {
  none: {
    auctionBidsPerMonth: 0,
    auctionFeeDiscount: 0,
    earlyAuctionAccess: false,
    masterClass: false,
    aiResearchTool: false,
    aiAuthenticationDiscount: 0,
    valueCharts: false,
    myCollection: false,
    privateBookRequests: 0,
    privateOfferSubmissions: 0,
    socialPosting: 0,
    conciergeService: false,
    noFeesWithConcierge: false,
  },
  silver: {
    auctionBidsPerMonth: 5,
    auctionFeeDiscount: 0,
    earlyAuctionAccess: false,
    masterClass: true,
    aiResearchTool: false,
    aiAuthenticationDiscount: 0,
    valueCharts: false,
    myCollection: true,
    privateBookRequests: 'unlimited',
    privateOfferSubmissions: 'unlimited',
    socialPosting: 'unlimited',
    conciergeService: false,
    noFeesWithConcierge: false,
  },
  gold: {
    auctionBidsPerMonth: 'unlimited',
    auctionFeeDiscount: 67,
    earlyAuctionAccess: true,
    masterClass: true,
    aiResearchTool: true,
    aiAuthenticationDiscount: 20,
    valueCharts: true,
    myCollection: true,
    privateBookRequests: 'unlimited',
    privateOfferSubmissions: 'unlimited',
    socialPosting: 'unlimited',
    conciergeService: false,
    noFeesWithConcierge: false,
  },
  platinum: {
    auctionBidsPerMonth: 'unlimited',
    auctionFeeDiscount: 67,
    earlyAuctionAccess: true,
    masterClass: true,
    aiResearchTool: true,
    aiAuthenticationDiscount: 20,
    valueCharts: true,
    myCollection: true,
    privateBookRequests: 'unlimited',
    privateOfferSubmissions: 'unlimited',
    socialPosting: 'unlimited',
    conciergeService: true,
    noFeesWithConcierge: true,
  },
};

/**
 * Get membership tier from plan slug
 */
export function getTierFromSlug(slug: string | null | undefined): MembershipTier {
  if (!slug) return 'none';
  const normalized = slug.toLowerCase();
  if (normalized === 'silver') return 'silver';
  if (normalized === 'gold') return 'gold';
  if (normalized === 'platinum') return 'platinum';
  return 'none';
}

/**
 * Get features for a membership tier
 */
export function getFeaturesForTier(tier: MembershipTier): MembershipFeatures {
  return TIER_FEATURES[tier];
}

/**
 * Check if user has access to a specific feature
 */
export function hasFeatureAccess(tier: MembershipTier, feature: keyof MembershipFeatures): boolean {
  const features = getFeaturesForTier(tier);
  const value = features[feature];

  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  if (value === 'unlimited') return true;

  return false;
}

/**
 * Check if user can place an auction bid
 */
export function canPlaceBid(tier: MembershipTier, bidsThisMonth: number): boolean {
  const limit = TIER_FEATURES[tier].auctionBidsPerMonth;
  if (limit === 'unlimited') return true;
  return bidsThisMonth < limit;
}

/**
 * Get auction fee discount percentage
 */
export function getAuctionFeeDiscount(tier: MembershipTier): number {
  return TIER_FEATURES[tier].auctionFeeDiscount;
}

/**
 * Check if user tier is at least the required tier
 */
export function hasTierOrHigher(
  currentTier: MembershipTier,
  requiredTier: MembershipTier,
): boolean {
  const tierOrder: MembershipTier[] = ['none', 'silver', 'gold', 'platinum'];
  const currentIndex = tierOrder.indexOf(currentTier);
  const requiredIndex = tierOrder.indexOf(requiredTier);
  return currentIndex >= requiredIndex;
}

/**
 * Get tier display name
 */
export function getTierDisplayName(tier: MembershipTier): string {
  const names: Record<MembershipTier, string> = {
    none: 'No Membership',
    silver: 'Silver Member',
    gold: 'Gold Member',
    platinum: 'Platinum Member',
  };
  return names[tier];
}

/**
 * Get tier color for badges/UI
 */
export function getTierColor(tier: MembershipTier): {
  bg: string;
  text: string;
  border: string;
} {
  const colors: Record<MembershipTier, { bg: string; text: string; border: string }> = {
    none: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-300' },
    silver: { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-300' },
    gold: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
    platinum: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300' },
  };
  return colors[tier];
}
