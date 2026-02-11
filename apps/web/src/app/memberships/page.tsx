'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from '@/lib/clientTranslations';
import PlanCard from '@/components/memberships/PlanCard';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
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

    // Get translated features or fallback to database features
    let features: string[] = [];
    try {
      const translatedFeatures = t(`memberships.plans.${slug}.features`) as unknown;
      if (Array.isArray(translatedFeatures)) {
        features = translatedFeatures;
      } else {
        features = plan.features || [];
      }
    } catch {
      features = plan.features || [];
    }

    // Get translated name and tagline
    const name = t(`memberships.plans.${slug}.name`) || plan.name;
    const tagline = t(`memberships.plans.${slug}.tagline`) || `$${plan.price}/month`;

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

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
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
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {plansLoading || subscriptionLoading ? (
            <div className="flex items-center justify-center py-20">
              <FontAwesomeIcon
                icon={['fal', 'spinner-third']}
                spin
                className="text-5xl text-primary"
              />
            </div>
          ) : plansError ? (
            <div className="flex items-center justify-center gap-3 py-20 text-red-600">
              <FontAwesomeIcon icon={['fal', 'exclamation-circle']} className="text-3xl" />
              <p className="text-lg">Failed to load membership plans. Please try again later.</p>
            </div>
          ) : plans.length === 0 ? (
            <div className="text-center py-20 text-gray-600">
              <p className="text-lg">No membership plans available at this time.</p>
            </div>
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-primary mb-2">25+</div>
              <p className="text-gray-600">Years of Expertise</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">10,000+</div>
              <p className="text-gray-600">Active Members</p>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">50,000+</div>
              <p className="text-gray-600">Rare Books Catalogued</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
