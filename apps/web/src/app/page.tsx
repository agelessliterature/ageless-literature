'use client';

import Link from 'next/link';
import { useTranslations } from '@/lib/clientTranslations';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Auction } from '@/types/Auction';
import AuctionCountdown from '@/components/auctions/AuctionCountdown';
import { useEffect, useRef, useState, useCallback } from 'react';
import { CloudinaryImage } from '@/components/ui/CloudinaryImage';
import { motion, useInView } from 'framer-motion';
// import CountUp from 'react-countup';

const basePath = process.env.NODE_ENV === 'production' ? '/v2' : '';

// Stats Card Component with Count-Up Animation
function StatsCard({ icon, value, suffix, label, delay }: { icon: string; value: number; suffix: string; label: string; delay: number }) {
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
    >
      <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
        <FontAwesomeIcon icon={['fal', icon] as [string, string]} className="text-3xl text-primary" />
      </div>
      <div className="text-4xl font-bold text-primary mb-2">
        {value.toLocaleString()}{suffix}
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
      imageUrl: 'https://res.cloudinary.com/dvohtcqvi/image/upload/v1767984844/categories/african-american.jpg',
    },
    {
      id: 2,
      name: 'AUCTIONS',
      slug: 'auctions',
      imageUrl: 'https://res.cloudinary.com/dvohtcqvi/image/upload/v1767984846/categories/americana.jpg',
    },
    {
      id: 3,
      name: 'SIGNED + ASSOCIATION COPIES',
      slug: 'signed',
      imageUrl: 'https://res.cloudinary.com/dvohtcqvi/image/upload/v1767984886/categories/first-editions.jpg',
    },
    {
      id: 4,
      name: 'ONE-OF-ONE',
      slug: 'african-american',
      imageUrl: 'https://res.cloudinary.com/dvohtcqvi/image/upload/v1767984844/categories/african-american.jpg',
    },
    {
      id: 5,
      name: 'ANTIQUARIAN',
      slug: 'americana',
      imageUrl: 'https://res.cloudinary.com/dvohtcqvi/image/upload/v1767984846/categories/americana.jpg',
    },
    {
      id: 6,
      name: 'FIRST PRINTINGS',
      slug: 'first-editions',
      imageUrl: 'https://res.cloudinary.com/dvohtcqvi/image/upload/v1767984886/categories/first-editions.jpg',
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
  const scrollToIndex = useCallback((index: number, smooth = true) => {
    if (sliderRef.current && auctions && auctions.length > 0) {
      const cardWidth = sliderRef.current.scrollWidth / auctions.length;
      sliderRef.current.scrollTo({
        left: cardWidth * index,
        behavior: smooth ? 'smooth' : 'auto',
      });
    }
  }, [auctions]);

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
            className="relative"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            {/* Navigation Arrows */}
            {auctions && auctions.length > 0 && (
              <>
                <button
                  onClick={handlePrev}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-black/80 hover:bg-black text-white w-12 h-12 flex items-center justify-center transition-all duration-300 -ml-4"
                  aria-label="Previous auction"
                >
                  <FontAwesomeIcon icon={['fal', 'chevron-left']} className="text-xl" />
                </button>
                <button
                  onClick={handleNext}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-black/80 hover:bg-black text-white w-12 h-12 flex items-center justify-center transition-all duration-300 -mr-4"
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
              style={{ scrollSnapType: 'x mandatory' }}
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
                  const isEndingSoon = endDate && new Date(endDate).getTime() - Date.now() < 24 * 60 * 60 * 1000;

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
                          <div className="absolute top-4 right-4 z-10 bg-red-600 text-white px-3 py-1 text-xs font-bold shadow-lg" style={{ borderRadius: 0 }}>
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

                        {/* Current Bid */}
                        <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-700">
                          <span className="text-sm text-gray-300 font-semibold">CURRENT BID</span>
                          <span className="text-2xl font-bold text-white">
                            {Math.floor(Number(auction.currentBid || auction.startingPrice))} USD
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
                            <AuctionCountdown
                              endsAt={endDate}
                            />
                          </span>
                        </div>

                        {/* Bid Button */}
                        <button 
                          className="flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-black px-6 py-2 text-sm font-semibold transition-all duration-300 w-full"
                          style={{ borderRadius: '1.5rem' }}
                        >
                          {t('featuredAuctions.bidNow')}
                        </button>
                      </div>
                    </Link>
                  );
                })
              ) : (
                // No Auctions Found
                <div className="w-full flex flex-col items-center justify-center text-center py-12">
                  <FontAwesomeIcon icon={['fal', 'gavel']} className="text-6xl text-gray-300 mb-4" />
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
            <div className="text-center mt-12">
              <Link
                href="/auctions"
                className="inline-flex items-center gap-4 text-primary hover:text-secondary font-semibold transition-colors"
                style={{ fontSize: '2.15rem' }}
              >
                {t('featuredAuctions.viewAll').toUpperCase()}
                <FontAwesomeIcon icon={['fal', 'arrow-right']} className="text-xl" />
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
            <StatsCard icon="users" value={500} suffix="+" label="Trusted Booksellers" delay={0.2} />
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
              src={`${basePath}/home-page/RenderedImage.jpeg`}
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
                Curated Rare Books<br />for Serious Collectors.
              </h2>
              <p className="text-base md:text-lg text-white/90 mb-8 max-w-xl">
                12,000+ rare books and collectible works<br />each selected for significance and lasting value.
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
              <h3 className="text-2xl md:text-3xl font-serif text-gray-800 mb-2">
                High Spots
              </h3>
              <p className="text-sm md:text-base text-gray-600 mb-4">
                Recent Museum-Quality Acquisitions
              </p>
              <Link
                href="/shop"
                className="inline-block border border-gray-400 text-gray-700 hover:bg-gray-700 hover:text-white px-6 py-2 text-xs font-semibold transition-all duration-300"
              >
                VIEW ALL
              </Link>
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
            className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center bg-white p-8 shadow-sm"
          >
            {/* Image on Left */}
            <div
              className="relative overflow-hidden w-full aspect-square max-w-lg mx-auto lg:ml-auto lg:mr-0"
              style={{
                backgroundImage: `url(${basePath}/home-page/IMG_7760.jpeg)`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
              role="img"
              aria-label="February High Spots"
            />

            {/* Content on Right */}
            <div className="flex flex-col justify-center">
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif italic text-gray-800 mb-6">
                FEBRUARY<br />HIGH SPOTS
              </h2>
              <p className="text-sm md:text-base text-gray-600 leading-relaxed mb-8 max-w-xl">
                Highlights of our recently added inventory include a Gutenberg Bible leaf, Mercator's Magna Opera, a truly storied 1591 Greek New Testament, a rare Russian Royal portrait by Thaddeus Kossler, accompanied by a 1st Albert Camus typewriter, and an orbit illustration of Shakespeare's Bamabek.
              </p>
              <div>
                <Link
                  href="/products/gutenberg-bible-a-leaf-from-the-book-of-jeremiah/dqr0rl-e6d2zk"
                  className="inline-block border-2 border-gray-800 text-gray-800 px-8 py-3 text-sm font-semibold hover:bg-gray-800 hover:text-white transition-all duration-300"
                >
                  LEARN MORE
                </Link>
              </div>
            </div>
          </motion.div>
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
                <h3 className="font-bold text-primary mb-6 tracking-wide uppercase" style={{ fontSize: '0.9rem' }}>
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
          <div className="text-center mt-12">
            <Link
              href="/categories"
              className="inline-flex items-center gap-2 text-primary hover:text-secondary font-semibold text-lg transition-colors"
            >
              VIEW ALL CATEGORIES
              <FontAwesomeIcon icon={['fal', 'arrow-right']} className="text-base" />
            </Link>
          </div>
        </div>
      </section>
      <section className="bg-white">
          {/* Download Mobile App Section */}
            <Link
              href="https://apps.apple.com/us/app/ageless-literature/id6747270974"
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-black text-white py-6 text-center hover:bg-gray-900 transition-colors duration-300"
            >
              <h3 className="text-xl md:text-2xl font-bold tracking-wider uppercase">
                DOWNLOAD OUR MOBILE APP
              </h3>
            </Link>
      </section>

      {/* Memberships Section */}
      <section className="py-24 bg-white">
        <div className="mx-auto px-4 sm:px-6 lg:px-8">
          <div 
            className="max-w-7xl mx-auto p-8 md:p-12 relative" 
            style={{
              background: 'linear-gradient(white, white) padding-box, linear-gradient(135deg, #d4af37, #f4e5a1, #d4af37, #c9a02c) border-box',
              border: '1px solid #000',
              boxShadow: '0 0 8px 1px #D4AF37',
              borderRadius: 0
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
                  href="https://www.agelessliterature.academy/product-launch-optin-page--12f00"
                  target="_blank"
                  className="inline-block bg-black hover:bg-gray-900 text-white px-8 py-4 text-lg font-semibold transition-all duration-300"
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
