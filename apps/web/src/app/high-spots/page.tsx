'use client';

import { ReactNode, useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const sections = [
  {
    title: 'Admiral Michiel Adriaensz',
    text: `A prominent figure in Dutch naval history, Admiral Michiel
    Adriaensz was a key leader during the 17th century. Known for
    his strategic prowess and leadership, he played a crucial
    role in the Dutch Golden Age, particularly in the
    Anglo-Dutch Wars. A defining strategist of maritime Europe, his naval victories
    shaped the balance of power during the height of the Dutch Republic. Through tactical brilliance and disciplined fleets, he
    transformed naval warfare into a refined art of precision and
    endurance. His leadership embodied resilience, innovation, and a relentless
    commitment to national sovereignty during turbulent times. Today, his legacy endures as one of the most celebrated
    admirals of the Dutch Golden Age.`,
    image: '/high-spots/Admiral-Michiel-Adriaensz.png',
  },
  {
    title: 'Gutenberg Bible: A Leaf From The Book of Jeremiah',
    text: `The Gutenberg Bible, also known as the 42-line Bible, is one of the most 
    significant and iconic books in the history of printing. Printed by Johannes Gutenberg 
    in the 1450s, it was the first major book produced using movable type, revolutionizing 
    the way information was disseminated and making books more accessible to a wider audience. 
    The leaf from the Book of Jeremiah is a rare and valuable artifact that represents a tangible 
    connection to this groundbreaking moment in history. It showcases the intricate craftsmanship 
    and attention to detail that went into the production of the Gutenberg Bible, with its 
    beautifully designed typeface and meticulous layout. This leaf serves as a testament to the 
    enduring legacy of Gutenberg's invention and its profound impact on literacy, education, and 
    culture worldwide.`,
    image: '/high-spots/gutenberg-bible.jpg',
  },
  {
    title: 'Third Dutch Edition of the Magnus Opus by Maria Sibylla Merian',
    text: `The third Dutch edition of the Magnus Opus by Maria Sibylla Merian is a remarkable 
    work that showcases the extraordinary talent and dedication of this pioneering naturalist 
    and artist. Published in the late 17th century, this edition features Merian's meticulous 
    observations and stunning illustrations of insects and plants from Suriname. Her groundbreaking 
    approach to studying and depicting the natural world challenged traditional scientific methods 
    and paved the way for future generations of naturalists. The third Dutch edition not only 
    highlights Merian's artistic prowess but also serves as a testament to her enduring legacy 
    as a trailblazer in both art and science.`,
    image: '/high-spots/third-dutch-edition.jpg',
  },
  {
    title: 'Admiral Michiel Adriaensz',
    text: `A prominent figure in Dutch naval history, Admiral Michiel
    Adriaensz was a key leader during the 17th century. Known for
    his strategic prowess and leadership, he played a crucial
    role in the Dutch Golden Age, particularly in the
    Anglo-Dutch Wars. A defining strategist of maritime Europe, his naval victories
    shaped the balance of power during the height of the Dutch Republic. Through tactical brilliance and disciplined fleets, he
    transformed naval warfare into a refined art of precision and
    endurance. His leadership embodied resilience, innovation, and a relentless
    commitment to national sovereignty during turbulent times. Today, his legacy endures as one of the most celebrated
    admirals of the Dutch Golden Age.`,
    image: '/high-spots/Admiral-Michiel-Adriaensz.png',
  },
  {
    title: 'Admiral Michiel Adriaensz',
    text: `A prominent figure in Dutch naval history, Admiral Michiel
    Adriaensz was a key leader during the 17th century. Known for
    his strategic prowess and leadership, he played a crucial
    role in the Dutch Golden Age, particularly in the
    Anglo-Dutch Wars. A defining strategist of maritime Europe, his naval victories
    shaped the balance of power during the height of the Dutch Republic. Through tactical brilliance and disciplined fleets, he
    transformed naval warfare into a refined art of precision and
    endurance. His leadership embodied resilience, innovation, and a relentless
    commitment to national sovereignty during turbulent times. Today, his legacy endures as one of the most celebrated
    admirals of the Dutch Golden Age.`,
    image: '/high-spots/Admiral-Michiel-Adriaensz.png',
  },
];

interface AnimatedBlockProps {
  children: ReactNode;
  direction: 'left' | 'right';
  style?: React.CSSProperties;
}

function AnimatedBlock({ children, direction, style }: AnimatedBlockProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const isInView = useInView(ref, {
    amount: 0.35,
    margin: '-50px 0px -50px 0px', // smoother trigger zone
  });

  const offset = direction === 'left' ? -60 : 60;

  return (
    <motion.div
      ref={ref}
      style={style}
      initial={{ opacity: 0, x: offset }}
      animate={{
        opacity: isInView ? 1 : 0.4, // don’t fully disappear
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

export default function HighSpotsPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Hero */}
      <div style={{ textAlign: 'center', padding: '1rem 1rem' }}>
        <h1
          style={{
            fontSize: '3rem',
            fontWeight: 'bold',
            color: '#1f2937',
            marginBottom: '1.5rem',
          }}
        >
          High Spots
        </h1>
        <p
          style={{
            fontSize: '1.25rem',
            color: '#4b5563',
            maxWidth: '48rem',
            margin: '0 auto',
            lineHeight: '1.6',
          }}
        >
          Your insight into the most captivating and significant moments in literature, art, and
          culture.
        </p>
      </div>

      <section style={{ paddingBottom: '6rem' }}>
        <div style={{ maxWidth: '100%', padding: '0 1rem' }}>
          {sections.map((section, index) => {
            const isReversed = index % 2 !== 0;

            return (
              <div key={index} style={{ padding: '4rem 0' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.2fr 1.2fr',
                    gap: '3rem',
                    alignItems: 'center',
                  }}
                >
                  {/* Image */}
                  <AnimatedBlock
                    direction={isReversed ? 'right' : 'left'}
                    style={{ order: isReversed ? 2 : 1 }}
                  >
                    <div
                      style={{
                        borderRadius: '1rem',
                        overflow: 'hidden',
                        boxShadow: '0 10px 15px rgba(0,0,0,0.1)',
                      }}
                    >
                      <img
                        src={section.image}
                        alt={section.title}
                        style={{
                          width: '100%',
                          aspectRatio: '14/16',
                          objectFit: 'contain',
                        }}
                      />
                    </div>
                  </AnimatedBlock>

                  {/* Content */}
                  <AnimatedBlock
                    direction={isReversed ? 'left' : 'right'}
                    style={{ order: isReversed ? 1 : 2 }}
                  >
                    <div>
                      <h2
                        style={{
                          fontSize: '2rem',
                          fontWeight: 'bold',
                          color: '#1f2937',
                        }}
                      >
                        {section.title}
                      </h2>

                      <div
                        style={{
                          height: '4px',
                          width: '64px',
                          background: 'linear-gradient(to right, #d97706, #eab308)',
                          borderRadius: '9999px',
                          marginTop: '0.75rem',
                        }}
                      />

                      <p
                        style={{
                          fontSize: '1.125rem',
                          color: '#4b5563',
                          lineHeight: '1.75',
                          marginTop: '1.5rem',
                        }}
                      >
                        {section.text}
                      </p>
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
