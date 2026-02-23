'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from '@/lib/clientTranslations';
import { useMessages } from 'next-intl';
import PlanCard from '@/components/memberships/PlanCard';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import PageLoading from '@/components/ui/PageLoading';
import EmptyState from '@/components/ui/EmptyState';
import InlineError from '@/components/ui/InlineError';
import { getApiUrl } from '@/lib/api';

interface MembershipPlan {
  id: string;
  name: string;
  slug: string;
  price: number;
  description: string;
  features: string[];
  isActive: boolean;
}

interface UserSubscription {
  id: string;
  planId: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  plan: MembershipPlan;
}

export default function MembershipPage() {
  const t = useTranslations('home');
  const messages = useMessages() as {
    home?: {
      memberships?: {
        plans?: Record<
          string,
          {
            features?: string[];
            name?: string;
            tagline?: string;
          }
        >;
      };
    };
  };

  // Fetch membership plans
  const {
    data: plansData,
    isLoading: plansLoading,
    error: plansError,
  } = useQuery<{ success: boolean; data: MembershipPlan[] }>({
    queryKey: ['membershipPlans'],
    queryFn: async () => {
      const res = await fetch(getApiUrl('api/memberships/plans'));
      if (!res.ok) throw new Error('Failed to fetch plans');
      return res.json();
    },
  });

  // Fetch user's current subscription
  const { data: subscriptionData, isLoading: subscriptionLoading } = useQuery<{
    success: boolean;
    data: UserSubscription | null;
  }>({
    queryKey: ['userSubscription'],
    queryFn: async () => {
      const res = await fetch(getApiUrl('api/memberships/subscription'));
      if (!res.ok) {
        if (res.status === 401) return { success: true, data: null }; // Not logged in
        throw new Error('Failed to fetch subscription');
      }
      return res.json();
    },
    retry: false,
  });

  const plans = plansData?.data || [];
  const currentSubscription = subscriptionData?.data;

  // Map plan data to include translated features and plan-specific details
  const getEnrichedPlanData = (plan: MembershipPlan) => {
    const slug = plan.slug.toLowerCase();

    // Get translated features from messages object (supports arrays)
    let features: string[] = [];
    try {
      const planMessages = messages?.home?.memberships?.plans?.[slug];
      if (planMessages?.features && Array.isArray(planMessages.features)) {
        features = planMessages.features;
      } else {
        features = plan.features || [];
      }
    } catch {
      features = plan.features || [];
    }

    // Get translated name and tagline
    let name = plan.name;
    let tagline = `$${plan.price}/month`;

    try {
      const planMessages = messages?.home?.memberships?.plans?.[slug];
      if (planMessages?.name) name = planMessages.name;
      if (planMessages?.tagline) tagline = planMessages.tagline;
    } catch {
      // Use defaults
    }

    // Determine highlight badge
    let highlight: 'popular' | 'premium' | 'starter' | null = null;
    if (slug === 'gold') highlight = 'popular';
    if (slug === 'platinum') highlight = 'premium';
    if (slug === 'silver') highlight = 'starter';

    return {
      ...plan,
      name,
      tagline,
      features,
      highlight,
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <section className="relative py-12 sm:py-20 bg-gradient-to-r from-primary to-primary-dark overflow-hidden">
        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-secondary/10  blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-secondary/10  blur-3xl" />

        <div className="relative mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold text-white mb-4 tracking-tight">
            {t('memberships.pageTitle')}
          </h1>
          <p className="text-xl sm:text-2xl md:text-3xl text-white/90 italic">
            {t('memberships.pageSubtitle')}
          </p>
        </div>
      </section>

      {/* Current Subscription Banner */}
      {currentSubscription && currentSubscription.status === 'active' && (
        <section className="bg-green-50 border-b border-green-200">
          <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-center gap-3">
              <FontAwesomeIcon icon={['fal', 'check-circle']} className="text-2xl text-green-600" />
              <p className="text-lg text-green-800">
                You're currently subscribed to the <strong>{currentSubscription.plan.name}</strong>{' '}
                plan
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Plans Grid */}
      <section className="py-12 sm:py-20">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          {plansLoading || subscriptionLoading ? (
            <PageLoading message="Loading membership plans..." fullPage={false} />
          ) : plansError ? (
            <InlineError message="Failed to load membership plans. Please try again later." />
          ) : plans.length === 0 ? (
            <EmptyState
              icon={['fal', 'inbox']}
              title="No plans available"
              description="No membership plans available at this time."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {plans.map((plan, index) => {
                const enrichedPlan = getEnrichedPlanData(plan);
                const isCurrentPlan = currentSubscription?.planId === plan.id;

                return (
                  <PlanCard
                    key={plan.id}
                    name={enrichedPlan.name}
                    price={plan.price}
                    tagline={enrichedPlan.tagline}
                    features={enrichedPlan.features}
                    slug={plan.slug}
                    highlight={enrichedPlan.highlight}
                    index={index}
                    isCurrentPlan={isCurrentPlan}
                  />
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary-dark to-primary">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">{t('memberships.cta.title')}</h2>
          <p className="text-lg text-white/90 leading-relaxed mb-8">
            {t('memberships.cta.description')}
          </p>
          <a
            href="#plans"
            onClick={(e) => {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="inline-block bg-secondary hover:bg-secondary/90 text-primary px-10 py-4 text-lg font-semibold transition-all duration-300 hover:scale-105"
          >
            {t('memberships.cta.button')}
          </a>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-16 bg-white">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <FontAwesomeIcon
                icon={['fal', 'award']}
                className="text-5xl text-primary mb-4 mx-auto"
              />
              <div className="text-4xl font-bold text-primary mb-2">25+</div>
              <p className="text-gray-600">Years of Expertise</p>
            </div>
            <div>
              <FontAwesomeIcon
                icon={['fal', 'users']}
                className="text-5xl text-primary mb-4 mx-auto"
              />
              <div className="text-4xl font-bold text-primary mb-2">10,000+</div>
              <p className="text-gray-600">Active Members</p>
            </div>
            <div>
              <FontAwesomeIcon
                icon={['fal', 'books']}
                className="text-5xl text-primary mb-4 mx-auto"
              />
              <div className="text-4xl font-bold text-primary mb-2">50,000+</div>
              <p className="text-gray-600">Rare Books Catalogued</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
