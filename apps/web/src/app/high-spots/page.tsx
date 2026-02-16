'use client';

import { motion } from 'framer-motion';

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
              <div key={index} style={{ padding: '2rem 0' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.2fr 1.2fr',
                    gap: '3rem',
                    alignItems: 'center',
                  }}
                >
                  {/* Image */}
                  <motion.div
                    initial={{ opacity: 0, x: isReversed ? 150 : -150 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    viewport={{ once: true, amount: 0.3 }}
                    style={{
                      order: isReversed ? 2 : 1,
                    }}
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
                  </motion.div>

                  {/* Content */}
                  <motion.div
                    initial={{ opacity: 0, x: isReversed ? -150 : 150 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    viewport={{ once: true, amount: 0.3 }}
                    style={{
                      order: isReversed ? 1 : 2,
                    }}
                  >
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
                  </motion.div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
