'use client';

import { ReactNode, useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import api from '@/lib/api';

/* -----------------------------
   Animated Block
------------------------------ */
interface AnimatedBlockProps {
  children: ReactNode;
  direction: 'left' | 'right';
  className?: string;
}

interface HighSpotApiItem {
  title: string;
  description: string;
  image: string | null;
  productLink: string | null;
}

interface HighSpotsApiData {
  title?: string;
  items?: HighSpotApiItem[];
}

interface HighSpotSection {
  title: string;
  text: string;
  image: string;
  button?: {
    text: string;
    href: string;
  };
}

function AnimatedBlock({ children, direction, className }: AnimatedBlockProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const isInView = useInView(ref, {
    amount: 0.35,
    margin: '-50px 0px -50px 0px',
  });

  const offset = direction === 'left' ? -60 : 60;

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, x: offset }}
      animate={{
        opacity: isInView ? 1 : 0.4,
        x: isInView ? 0 : offset,
      }}
      transition={{
        type: 'spring',
        stiffness: 90,
        damping: 18,
        mass: 0.6,
      }}
    >
      {children}
    </motion.div>
  );
}

/* -----------------------------
   Page
------------------------------ */
export default function HighSpotsPage() {
  const [sections, setSections] = useState<HighSpotSection[]>([]);
  const [pageTitle, setPageTitle] = useState('High Spots');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadHighSpots = async () => {
      try {
        const response = await api.get('/high-spots');
        const apiData = (response?.data?.data || {}) as HighSpotsApiData;
        const apiItems = apiData.items;

        if (typeof apiData.title === 'string' && apiData.title.trim()) {
          setPageTitle(apiData.title.trim());
        } else {
          setPageTitle('High Spots');
        }

        const mapped: HighSpotSection[] = Array.isArray(apiItems)
          ? (apiItems as HighSpotApiItem[]).map((item) => {
              const section: HighSpotSection = {
                title: item.title,
                text: item.description || '',
                image: item.image || '',
              };

              if (item.productLink) {
                section.button = {
                  text: 'View Product',
                  href: item.productLink,
                };
              }

              return section;
            })
          : [];

        setSections(mapped);
      } catch (_error) {
        setPageTitle('High Spots');
        setSections([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadHighSpots();
  }, []);

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* ---------------- HERO ---------------- */}
      <div
        className="relative h-[700px] w-full bg-cover bg-center"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)),
            url('/high-spots/dark-academia-books.webp')
          `,
        }}
      >
        <h1
          className="absolute top-8 sm:top-12 md:top-16 left-1/2 -translate-x-1/2 
               text-3xl sm:text-[2.25rem] md:text-[2.75rem] lg:text-[3.5rem]
               font-bold tracking-[0.05em] text-white text-center px-4 mb-6"
        >
          {pageTitle}
        </h1>

        <div className="h-full flex items-center justify-center text-center px-4">
          <p className="max-w-[48rem] text-[1.25rem] leading-[1.6] text-gray-200 -mt-3">
            Each month, we delve into new High Spots, offering you a deeper understanding and
            appreciation of the treasures that have defined human creativity and expression
            throughout history.
          </p>
        </div>
      </div>

      {/* ---------------- CONTENT ---------------- */}
      <section className="pb-24 px-[4vw] pt-24">
        <div className="w-full">
          {!isLoading && sections.length === 0 && (
            <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-600">
              No high spots are currently configured.
            </div>
          )}

          {sections.map((section, index) => {
            const isReversed = index % 2 !== 0;

            return (
              <div key={index} className="py-16">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                  {/* Image */}
                  <AnimatedBlock
                    direction={isReversed ? 'right' : 'left'}
                    className={isReversed ? 'lg:order-2' : 'lg:order-1'}
                  >
                    <div className="rounded-2xl overflow-hidden shadow-lg">
                      <img
                        src={section.image}
                        alt={section.title}
                        className="w-full aspect-[14/16] object-contain"
                      />
                    </div>
                  </AnimatedBlock>

                  {/* Content */}
                  <AnimatedBlock
                    direction={isReversed ? 'left' : 'right'}
                    className={isReversed ? 'lg:order-1' : 'lg:order-2'}
                  >
                    <div>
                      <h2 className="text-[1.875rem] font-bold text-[#1f2937]">{section.title}</h2>

                      <div className="h-[4px] w-16 bg-gradient-to-r from-[#b45309] to-[#eab308] rounded-full mt-3" />

                      <p className="mt-6 text-[1.125rem] text-[#4b5563] leading-[1.6]">
                        {section.text}
                      </p>

                      {section.button && (
                        <a
                          href={section.button.href}
                          className="inline-block mt-6 bg-black text-white px-8 py-3 text-sm font-semibold transition-all duration-300 hover:bg-[#d4af37] hover:text-black hover:-translate-y-1"
                        >
                          {section.button.text}
                        </a>
                      )}
                    </div>
                  </AnimatedBlock>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
