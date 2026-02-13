'use client';

import Link from 'next/link';
import { useTranslations } from '@/lib/clientTranslations';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Auction } from '@/types/Auction';
import AuctionCountdown from '@/components/auctions/AuctionCountdown';
import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, useInView } from 'framer-motion';
import { BASE_PATH } from '@/lib/basePath';
// import CountUp from 'react-countup';

// Stats Card Component with Count-Up Animation
function StatsCard({
  icon,
  value,
  suffix,
  label,
  delay,
}: {
  icon: string;
  value: number;
  suffix: string;
  label: string;
  delay: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (isInView && !hasAnimated) {
      setHasAnimated(true);
    }
  }, [isInView, hasAnimated]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay }}
      className="text-center p-6 bg-gradient-to-br from-primary/5 to-secondary/5 hover:shadow-lg transition-all duration-300"
      style={{ borderRadius: '1.5rem' }}
    >
      <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
        <FontAwesomeIcon
          icon={['fal', icon] as [string, string]}
          className="text-3xl text-primary"
        />
      </div>
      <div className="text-4xl font-bold text-primary mb-2">
        {value.toLocaleString()}
        {suffix}
      </div>
      <p className="text-gray-600 font-medium">{label}</p>
    </motion.div>
  );
}

export default function Home() {
  const t = useTranslations('home');
  const sliderRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Featured categories - hardcoded selection
  const featuredCategories = [
    {
      id: 1,
      name: 'CURATED',
      slug: 'curated',
      imageUrl:
        'https://res.cloudinary.com/dvohtcqvi/image/upload/v1767984844/categories/african-american.jpg',
    },
    {
      id: 2,
      name: 'AUCTIONS',
      slug: 'auctions',
      imageUrl:
        'https://res.cloudinary.com/dvohtcqvi/image/upload/v1767984846/categories/americana.jpg',
    },
    {
      id: 3,
      name: 'SIGNED + ASSOCIATION COPIES',
      slug: 'signed',
      imageUrl:
        'https://res.cloudinary.com/dvohtcqvi/image/upload/v1767984886/categories/first-editions.jpg',
    },
  ];

  // Fetch active auctions
  const { data: auctions, isLoading } = useQuery<Auction[]>({
    queryKey: ['featured-auctions'],
    queryFn: async () => {
      const response = await api.get('/auctions', {
        params: {
          status: 'active',
          limit: 6,
        },
      });
      return response.data.data || [];
    },
  });

  // Auto-scroll functionality
  const scrollToIndex = useCallback(
    (index: number, smooth = true) => {
      if (sliderRef.current && auctions && auctions.length > 0) {
        const cardWidth = sliderRef.current.scrollWidth / auctions.length;
        sliderRef.current.scrollTo({
          left: cardWidth * index,
          behavior: smooth ? 'smooth' : 'auto',
        });
      }
    },
    [auctions],
  );

  // Calculate the maximum index based on visible items
  const getMaxIndex = useCallback(() => {
    if (!auctions) return 0;
    // Assume 4 items are visible at once (25% width each)
    const visibleItems = 4;
    // Maximum scroll position is when the last item is visible
    const maxIndex = Math.max(0, auctions.length - visibleItems);
    return maxIndex;
  }, [auctions]);

  useEffect(() => {
    if (!auctions || auctions.length === 0 || isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => {
        const maxIndex = Math.max(0, auctions.length - 4); // 4 visible items
        const nextIndex = prev >= maxIndex ? 0 : prev + 1;
        scrollToIndex(nextIndex);
        return nextIndex;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [auctions, isPaused, scrollToIndex]);

  const handlePrev = () => {
    if (!auctions || auctions.length === 0) return;
    const maxIndex = getMaxIndex();
    const newIndex = currentIndex === 0 ? maxIndex : currentIndex - 1;
    setCurrentIndex(newIndex);
    scrollToIndex(newIndex);
  };

  const handleNext = () => {
    if (!auctions || auctions.length === 0) return;
    const maxIndex = getMaxIndex();
    const newIndex = currentIndex >= maxIndex ? 0 : currentIndex + 1;
    setCurrentIndex(newIndex);
    scrollToIndex(newIndex);
  };

  return (
    <div className="min-h-screen">
      {/* Featured Auctions Section */}
      <section className="pt-56 pb-24 bg-white">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-primary mb-4">
              {t('featuredAuctions.title')}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Bid on extraordinary pieces from our curated auction collection
            </p>
          </div>

          {/* Horizontal Slider */}
          <div
            className="relative px-0 md:px-0"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            {/* Navigation Arrows - Hidden on mobile, visible on md+ */}
            {auctions && auctions.length > 0 && (
              <>
                <button
                  onClick={handlePrev}
                  className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-black/80 hover:bg-black text-white w-12 h-12 items-center justify-center transition-all duration-300 -ml-4"
                  aria-label="Previous auction"
                >
                  <FontAwesomeIcon icon={['fal', 'chevron-left']} className="text-xl" />
                </button>
                <button
                  onClick={handleNext}
                  className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-black/80 hover:bg-black text-white w-12 h-12 items-center justify-center transition-all duration-300 -mr-4"
                  aria-label="Next auction"
                >
                  <FontAwesomeIcon icon={['fal', 'chevron-right']} className="text-xl" />
                </button>
              </>
            )}

            {/* Slider Container */}
            <div
              ref={sliderRef}
              className="flex gap-6 overflow-x-auto scrollbar-hide scroll-smooth pb-4"
              style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
            >
              {isLoading ? (
                // Loading Placeholders
                Array.from({ length: 4 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="flex-shrink-0 w-[calc(25%-18px)] min-w-[280px] bg-gray-50 animate-pulse overflow-hidden"
                    style={{ scrollSnapAlign: 'start', borderRadius: 0 }}
                  >
                    <div className="aspect-[3/4] bg-gray-200" />
                    <div className="p-6 space-y-4">
                      <div className="h-6 bg-gray-200 w-3/4" style={{ borderRadius: 0 }} />
                      <div className="h-4 bg-gray-200 w-1/2" style={{ borderRadius: 0 }} />
                      <div className="h-8 bg-gray-200" style={{ borderRadius: 0 }} />
                    </div>
                  </div>
                ))
              ) : auctions && auctions.length > 0 ? (
                // Real Auction Cards
                auctions.map((auction) => {
                  const item = auction.item || auction.book || auction.product;
                  const itemImage =
                    (item as any)?.images?.[0]?.url ||
                    (item as any)?.media?.[0]?.imageUrl ||
                    '/placeholder.jpg';
                  const itemTitle = item?.title || 'Auction Item';
                  const endDate = (auction as any).endDate || (auction as any).endsAt;
                  const isEndingSoon =
                    endDate && new Date(endDate).getTime() - Date.now() < 24 * 60 * 60 * 1000;

                  return (
                    <Link
                      key={auction.id}
                      href={`/products/${item?.slug || item?.id}`}
                      className="flex-shrink-0 w-[calc(25%-18px)] min-w-[280px] group block bg-black shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 overflow-hidden"
                      style={{ scrollSnapAlign: 'start', borderRadius: '1.5rem' }}
                    >
                      {/* Status Badge */}
                      <div className="relative">
                        {isEndingSoon && (
                          <div
                            className="absolute top-4 right-4 z-10 bg-red-600 text-white px-3 py-1 text-xs font-bold shadow-lg"
                            style={{ borderRadius: 0 }}
                          >
                            ENDING SOON
                          </div>
                        )}

                        {/* Image */}
                        <div className="aspect-[3/4] bg-gray-100 overflow-hidden">
                          <img
                            src={itemImage}
                            alt={itemTitle}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-6">
                        <h3 className="text-sm font-semibold text-white mb-1 group-hover:text-secondary transition-colors line-clamp-2 h-14">
                          {itemTitle}
                        </h3>

                        {/* Bid Price */}
                        <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-700">
                          <span className="text-sm text-gray-300 font-semibold">
                            {auction.bidCount ? 'CURRENT BID' : 'STARTING BID'}
                          </span>
                          <span className="text-2xl font-bold text-white">
                            {Math.floor(
                              Number(auction.bidCount ? auction.currentBid : auction.startingPrice),
                            )}{' '}
                            USD
                          </span>
                        </div>

                        {/* Bid Count and Time Remaining */}
                        <div className="flex justify-between items-center text-sm text-gray-300 mb-4">
                          <span className="flex items-center gap-1">
                            <FontAwesomeIcon icon={['fal', 'hammer'] as [string, string]} />
                            {auction.bidCount || 0} {auction.bidCount === 1 ? 'bid' : 'bids'}
                          </span>
                          <span className="font-semibold flex items-center gap-1">
                            <FontAwesomeIcon icon={['fal', 'clock'] as [string, string]} />
                            <AuctionCountdown endsAt={endDate} />
                          </span>
                        </div>

                        {/* Bid Button */}
                        <div
                          className="flex items-center justify-center gap-2 bg-secondary hover:bg-secondary/700 text-white hover:text-black px-6 py-2 text-sm font-semibold transition-all duration-300 w-full border-2 border-black hover:border-secondary cursor-pointer"
                          style={{ borderRadius: '1.5rem' }}
                          role="button"
                          tabIndex={0}
                        >
                          {t('featuredAuctions.bidNow')}
                        </div>
                      </div>
                    </Link>
                  );
                })
              ) : (
                // No Auctions Found
                <div className="w-full flex flex-col items-center justify-center text-center py-12">
                  <FontAwesomeIcon
                    icon={['fal', 'gavel']}
                    className="text-6xl text-gray-300 mb-4"
                  />
                  <p className="text-xl text-gray-500">No active auctions at the moment</p>
                  <p className="text-sm text-gray-400 mt-2">Check back soon for exciting items!</p>
                </div>
              )}
            </div>

            {/* Dot Indicators */}
            {auctions && auctions.length > 0 && (
              <div className="flex justify-center gap-2 mt-6">
                {auctions.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setCurrentIndex(index);
                      scrollToIndex(index);
                    }}
                    className={`w-2 h-2 transition-all duration-300 ${
                      index === currentIndex ? 'bg-black w-6' : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                    aria-label={`Go to auction ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* View All Button - Only show when auctions exist */}
          {auctions && auctions.length > 0 && (
            <div className="text-center mt-12 px-4 sm:px-0">
              <Link
                href="/auctions"
                className="inline-flex items-center justify-center gap-3 bg-black hover:bg-secondary text-white hover:text-black font-bold transition-all duration-300 border-2 border-black hover:border-secondary hover:scale-105 w-full sm:w-auto px-8 py-4 sm:px-12 sm:py-5 text-lg sm:text-xl shadow-lg hover:shadow-xl"
                style={{ borderRadius: '1.5rem' }}
              >
                <span>{t('featuredAuctions.viewAll').toUpperCase()}</span>
                <FontAwesomeIcon icon={['fal', 'arrow-right']} className="text-xl sm:text-2xl" />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Stats Section with Count-Up Animation */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8"
          >
            <StatsCard icon="book" value={10000} suffix="+" label="Rare Books Listed" delay={0} />
            <StatsCard
              icon="users"
              value={50}
              suffix="+"
              label="Vetted Booksellers & Galleries"
              delay={0.2}
            />
            <StatsCard icon="globe" value={50} suffix="+" label="Countries Worldwide" delay={0.4} />
            <StatsCard icon="headset" value={24} suffix="/7" label="Customer Support" delay={0.6} />
          </motion.div>
        </div>
      </section>

      {/* Curated Rare Books Section */}
      <section className="relative">
        {/* Hero Section with Background Image */}
        <div className="relative h-[400px] md:h-[800px] overflow-hidden">
          {/* Background Image */}
          <div className="absolute inset-0">
            <img
              src={`${BASE_PATH}/home-page/RenderedImage.jpeg`}
              alt="Curated Rare Books"
              className="w-full h-full object-cover"
            />
            {/* Dark Overlay */}
            <div className="absolute inset-0 bg-black/50"></div>
          </div>

          {/* Content Overlay */}
          <div className="relative h-full flex items-center justify-start px-8 md:px-16 lg:px-24">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
              className="max-w-2xl"
            >
              <h2 className="text-3xl md:text-4xl lg:text-6xl font-serif text-white mb-4 leading-tight">
                Curated Rare Books
                <br />
                for Serious Collectors.
              </h2>
              <p className="text-base md:text-lg text-white/90 mb-8 max-w-xl">
                12,000+ rare books and collectible works
                <br />
                each selected for significance and lasting value.
              </p>
              <Link
                href="/shop"
                className="inline-block bg-[#d4af37] hover:bg-[#c9a02c] text-black px-8 py-3 text-sm font-semibold transition-all duration-300"
              >
                Explore the Collection
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Trust Badges Section */}
        <div className="bg-[#f0ece4] py-8 md:py-8">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4"
            >
              {[
                { icon: 'book-open', label: 'Provenance-First\nCataloging' },
                { icon: 'clipboard-list', label: 'Condition Transparency' },
                { icon: 'shield-check', label: 'Insured & Secure Shipping' },
                { icon: 'user-shield', label: 'Collector-Level Guidance' },
              ].map((item, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col items-center text-center ${idx < 3 ? 'md:border-r md:border-gray-400/40' : ''}`}
                >
                  <FontAwesomeIcon
                    icon={['fal', item.icon as any]}
                    className="text-3xl md:text-4xl text-[#8b7d5e] mb-3"
                  />
                  <p className="text-sm md:text-base text-gray-700 font-serif whitespace-pre-line leading-snug">
                    {item.label}
                  </p>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* February High Spots Section */}
      <section className="bg-gray-50">
        <div className="mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center bg-white shadow-sm"
          >
            {/* Image on Left */}
            <div
              className="relative overflow-hidden w-full aspect-square mx-auto lg:ml-auto lg:mr-0 lg:h-[700px]"
              style={{
                backgroundImage: `url(${BASE_PATH}/home-page/IMG_7760.jpeg)`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
              role="img"
              aria-label="February High Spots"
            />

            {/* Content on Right */}
            <div className="flex flex-col justify-center">
              <h2 className="text-4xl md:text-5xl lg:text-7xl font-serif italic text-gray-800 mb-6">
                FEBRUARY
                <br />
                HIGH SPOTS
              </h2>
              <p className="text-lg md:text-base text-gray-600 leading-relaxed mb-8 max-w-[700px]">
                Highlights of our recently added inventory include a Gutenberg Bible leaf, Merian's
                Magnus Opus, a richly colored 1550 Greek New Testament, a 1521 Roman Missal printed
                by Thielman Kerver, an unpublished Aleister Crowley typescript, and an 1818
                Declaration of Independence broadside.
              </p>
              <div>
                <Link
                  href="/high-spots/"
                  className="inline-block bg-black text-white px-8 py-3 text-sm font-semibold hover:bg-[#d4af37] hover:text-black hover:-translate-y-1 transition-all duration-300"
                >
                  LEARN MORE
                </Link>
              </div>
            </div>
          </motion.div>
        </div>

        {/* High Spots Bottom Section */}
        <div className="bg-gray-100 py-8 md:py-12">
          <div className="max-w-7xl mx-auto px-8 md:px-16 lg:px-24">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <h3 className="text-3xl md:text-4xl py-4 font-bold text-primary tracking-wider">
                High Spots
              </h3>
              <p className="text-sm md:text-base text-gray-600 mb-4">
                Recent Museum-Quality Acquisitions
              </p>
              <Link
                href="/shop"
                className="inline-block bg-black text-white px-8 py-3 text-sm font-semibold hover:bg-[#d4af37] hover:text-black hover:-translate-y-1 transition-all duration-300"
              >
                VIEW ALL
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Explore Categories Section */}
      <section className="py-16 bg-white">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-primary tracking-wider">
              CATEGORIES
            </h2>
          </div>

          {/* Categories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-8 lg:gap-12">
            {featuredCategories.map((category) => (
              <Link
                key={category.id}
                href={`/shop?category=${category.slug}`}
                className="group block text-center"
              >
                {/* Category Name Above Image */}
                <h3
                  className="font-bold text-primary mb-6 tracking-wide uppercase"
                  style={{ fontSize: '0.9rem' }}
                >
                  {category.name}
                </h3>

                {/* Category Image */}
                <div className="relative overflow-hidden bg-white shadow-md hover:shadow-xl transition-all duration-300">
                  <div className="aspect-[3/4] relative overflow-hidden">
                    <img
                      src={category.imageUrl || '/placeholder.jpg'}
                      alt={category.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* View All Categories Link */}
          <div className="text-center mt-12 px-4 sm:px-0">
            <Link
              href="/categories"
              className="inline-flex items-center justify-center gap-3 bg-black hover:bg-secondary text-white hover:text-black font-bold transition-all duration-300 border-2 border-black hover:border-secondary hover:scale-105 w-full sm:w-auto px-8 py-4 sm:px-12 sm:py-5 text-lg sm:text-xl shadow-lg hover:shadow-xl"
              style={{ borderRadius: '1.5rem' }}
            >
              <span>VIEW ALL CATEGORIES</span>
              <FontAwesomeIcon icon={['fal', 'arrow-right']} className="text-xl sm:text-2xl" />
            </Link>
          </div>
        </div>
      </section>
      <section className="bg-white py-12">
        {/* Download Mobile App Section */}
        <div className="grid bg-gradient-to-b from-[#ffffff] to-[#c39e25] grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center shadow-sm px-8 lg:px-12 py-12">
          <div className="flex justify-center relative py-12">
            {/* Black Circle Backdrop */}
            <div className="absolute inset-0 flex justify-center items-center">
              <div className="w-96 h-96 bg-black rounded-full" />
            </div>
            {/* Image */}
            <div
              className="relative w-full max-w-sm aspect-[12/16] z-10"
              style={{
                backgroundImage: `url(${BASE_PATH}/home-page/al-mobile-phone.png)`,
                backgroundSize: 'contain',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }}
              role="img"
              aria-label="Mobile App"
            />
          </div>
          <div>
            <span className="block text-2xl font-bold mb-4">Download Our Mobile App Today!</span>
            <span className="block text-lg mb-6">
              Collect like a true professional from anywhere, in the palm of your hand.
            </span>
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="https://apps.apple.com/app/ageless-literature/id1234567890"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-black hover:bg-gray-800 hover:-translate-y-1 text-white px-6 py-3 font-semibold transition-all duration-300 flex-1 sm:flex-none"
              >
                <FontAwesomeIcon icon={['fab', 'apple']} className="text-xl" />
                <span>App Store</span>
              </a>
              <a
                href="https://play.google.com/store/apps/details?id=com.agelessliterature"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 bg-black hover:bg-gray-800 hover:-translate-y-1 text-white px-6 py-3 font-semibold transition-all duration-300 flex-1 sm:flex-none"
              >
                <FontAwesomeIcon icon={['fab', 'google-play']} className="text-xl" />
                <span>Google Play</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Memberships Section */}
      <section className="py-24 bg-white">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className="max-w-7xl mx-auto p-8 md:p-12 relative"
            style={{
              background:
                'linear-gradient(white, white) padding-box, linear-gradient(135deg, #d4af37, #f4e5a1, #d4af37, #c9a02c) border-box',
              border: '1px solid #000',
              boxShadow: '0 0 8px 1px #D4AF37',
              borderRadius: 0,
            }}
          >
            <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
              {/* YouTube Video */}
              <div className="lg:w-1/2">
                <div className="aspect-video w-full overflow-hidden" style={{ borderRadius: 0 }}>
                  <iframe
                    width="100%"
                    height="100%"
                    src="https://www.youtube.com/embed/LvlgbL3SIF8?feature=oembed"
                    title="Introducing the Ageless Literature Gold Memberships"
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  ></iframe>
                </div>
              </div>

              {/* Content */}
              <div className="lg:w-1/2 text-center lg:text-left">
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary mb-6">
                  {t('memberships.newTitle')}
                </h2>
                <p className="text-lg md:text-xl text-gray-700 mb-8 leading-relaxed">
                  {t('memberships.newDescription')}
                </p>
                <Link
                  href="/memberships"
                  target="_blank"
                  className="inline-block hover:-translate-y-1 bg-black hover:bg-gray-900 text-white px-8 py-4 text-lg font-semibold transition-all duration-300"
                  aria-label="Learn more about Ageless Literature memberships"
                >
                  {t('memberships.learnMore')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
