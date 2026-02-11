/**
 * Membership Benefits Configuration
 * Centralized source of truth for membership plan benefits
 */

export const membershipBenefits = {
  silver: [
    {
      text: 'Exclusive master class on book collecting from experts with 25+ years experience. 45+ Min long.',
      icon: 'graduate' as const,
    },
    {
      text: 'Unlimited Private Rare Book Requests',
      icon: 'book' as const,
    },
    {
      text: 'Access "My Collection" and display your collection digitally',
      icon: 'infinity' as const,
    },
    {
      text: 'Unlimited Private Offer Submissions',
      icon: 'comment' as const,
    },
    {
      text: 'Unlimited Social Posting',
      icon: 'infinity' as const,
    },
  ],
  gold: [
    {
      text: 'SAVE 67% ON ALL AUCTION FEES',
      icon: 'percent' as const,
      highlight: true,
    },
    {
      text: '24 hour early access to auctions',
      icon: 'clock' as const,
    },
    {
      text: 'Exclusive master class on book collecting from experts with 25+ years experience. 45+ Min long.',
      icon: 'graduate' as const,
    },
    {
      text: 'Unlimited Private Rare Book Requests',
      icon: 'book' as const,
    },
    {
      text: 'Access "My Collection" and display your collection digitally',
      icon: 'infinity' as const,
    },
    {
      text: 'Unlimited Private Offer Submissions',
      icon: 'comment' as const,
    },
    {
      text: 'Unlimited Social Posting',
      icon: 'infinity' as const,
    },
    {
      text: 'Unlimited access to our AI Rare Book Research Tool',
      icon: 'robot' as const,
    },
    {
      text: '20% OFF 3 AI Authentications /Month',
      icon: 'shield' as const,
    },
    {
      text: 'Access to value charts and data of the appreciation of collectible books',
      icon: 'chart' as const,
    },
  ],
  platinum: [
    {
      text: 'RECEIVE EVERY BENEFIT OF A GOLD MEMBERSHIP',
      icon: 'check' as const,
      highlight: true,
    },
    {
      text: 'Concierge Service - One-on-one guidance with an expert bookseller who shares your passion',
      icon: 'concierge' as const,
      highlight: true,
    },
    {
      text: 'Help you craft the library you have always dreamed of',
      icon: 'book' as const,
    },
    {
      text: 'With AL Platinum Service, you will never pay fees when working directly with your paired bookseller',
      icon: 'percent' as const,
    },
    {
      text: 'As your collection grows, you are free to request a new bookseller anytime—at no cost',
      icon: 'infinity' as const,
    },
  ],
};

export type MembershipPlanSlug = keyof typeof membershipBenefits;
