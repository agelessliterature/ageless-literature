'use client';

import { ReactNode, useRef } from 'react';
import { motion, useInView } from 'framer-motion';

// Auto-generate the current month name for the page title
function getCurrentMonth() {
  return new Date().toLocaleString('en-US', { month: 'long' });
}

/* -----------------------------
   Sections Data
------------------------------ */
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
    button: {
      text: 'View Product',
      href: '/products/portrait-of-lieutenant-admiral-michiel-adriaensz-de-ruyter-by-ferdinand-bol/uga1xk-zkzpyw',
    },
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
    button: {
      text: 'View Product',
      href: '/products/gutenberg-bible-a-leaf-from-the-book-of-jeremiah/dqr0rl-e6d2zk',
    },
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
    button: {
      text: 'View Product',
      href: '/products/third-dutch-edition-of-the-magnus-opus-by-maria-sibylla-merian-with-72-magnificent-plates-remarkably-clean-beautifully-coloured-/66z95x-ofvdnl',
    },
  },
  {
    title:
      'Monumental & Seminal Critical Edition of the Greek New Testament (1550), Richly Coloured',
    text: `The monumental and seminal critical edition of the Greek New Testament, published in 1550, 
    is a landmark achievement in biblical scholarship. This edition, richly coloured and meticulously 
    crafted, represents a significant advancement in the study of the New Testament. It was one of the 
    first critical editions to incorporate a comprehensive analysis of various manuscripts, providing 
    scholars with a more accurate and nuanced understanding of the biblical text. The use of colour in 
    this edition not only enhances its visual appeal but also serves to highlight important textual 
    variants and annotations, making it an invaluable resource for theologians, historians, and 
    scholars of religious studies. This edition stands as a testament to the dedication and scholarly 
    rigor that has shaped our understanding of the New Testament for centuries.`,
    image: '/high-spots/monumental-&-seminal.png',
    button: {
      text: 'View Product',
      href: '/products/monumental-seminal-critical-edition-of-the-greek-new-testament-1550-richly-coloured/qv0sqs-wthli3',
    },
  },
  {
    title: "1550 Chaucer's Works - Definitive Edition",
    text: `The 1550 definitive edition of Chaucer's works is a milestone in the preservation and 
    dissemination of medieval English literature. This edition, meticulously compiled and printed, 
    represents a crucial step in the standardization of Chaucer's writings. It includes his most 
    significant works such as "The Canterbury Tales," "Troilus and Criseyde," and "The Book of the Duchess." 
    The careful attention to textual accuracy and the use of high-quality printing techniques make 
    this edition a treasure for scholars and enthusiasts alike. It stands as a testament to the enduring 
    legacy of Chaucer's literary genius and his profound influence on English literature.`,
    image: '/high-spots/1550-chaucers-works.jpeg',
    button: {
      text: 'View Product',
      href: '/products/1550-chaucer-s-works-definitive-edition/vj8xcd-2vr2a0',
    },
  },
  {
    title:
      'General Orders of the War Department, 1862–1863, Including the Preliminary and Final Emancipation Proclamations',
    text: `The General Orders of the War Department from 1862–1863 are a pivotal collection of military 
    directives that played a crucial role in the American Civil War. These orders, which included the 
    Preliminary and Final Emancipation Proclamations, outlined key policies and strategies for Union forces. 
    They were instrumental in shaping wartime decisions and ultimately contributed to the end of slavery in 
    the United States. The documents are significant not only for their historical context but also for their 
    detailed instructions and administrative guidance.`,
    image: '/high-spots/general-orders-of-the-war-department.jpg',
    button: {
      text: 'View Product',
      href: '/products/general-orders-of-the-war-department-1862-1863-including-the-preliminary-and-final-emancipation-proclamations/4k7k4r-gosxjw',
    },
  },
  {
    title:
      'Miniature Illuminated Manuscript on Vellum with 12 Full-Page and 4 Miniatures by the Parisian Atelier of Maître François',
    text: `This exquisite miniature illuminated manuscript, created in the Parisian atelier of Maître 
    François, is a remarkable example of medieval artistic craftsmanship. The manuscript features 12 
    full-page illustrations and 4 smaller miniatures, all rendered with exceptional detail and vibrant 
    colours. The high-quality vellum provides a durable foundation for the intricate artwork, which 
    showcases the sophisticated techniques employed by medieval scribes and illuminators.`,
    image: '/high-spots/miniature-illuminated-manuscript.jpeg',
    button: {
      text: 'View Product',
      href: '/products/miniature-illuminated-manuscript-on-vellum-with-12-full-page-and-4-miniatures-by-the-parisian-atelier-of-ma-tre-fran-ois-/b324qh-7inaq6',
    },
  },
  {
    title: 'Roman Missal Printed by Thielmann Kerver’s 1521 Finely Bound Folio',
    text: `The Roman Missal printed by Thielmann Kerver in 1521 is a significant artifact in the history of 
    religious literature. This finely bound folio edition of the Missal, which contains the liturgical 
    texts used in the Catholic Mass, is a testament to the craftsmanship and dedication of early 
    16th-century printers. The Missal is not only a religious text but also a work of art, with its 
    intricate typography and elegant design. It reflects the cultural and spiritual values of its time, 
    making it a valuable piece for both historians and collectors.`,
    image: '/high-spots/roman-missal-printed.jpeg',
    button: {
      text: 'View Product',
      href: '/products/roman-missal-printed-by-thielmann-kerver-s-1521-finely-bound-folio/xw79a1-i5xf4q',
    },
  },
  {
    title: '1818 Declaration of Independence Broadside Engraved by Benjamin Owen Tyler',
    text: `The 1818 Declaration of Independence broadside, engraved by Benjamin Owen Tyler, is a significant
    historical document that commemorates the United States' independence from British rule. This broadside, 
    which features Tyler's intricate engraving work, serves as a powerful symbol of American patriotism and 
    the enduring ideals of liberty and self-governance. The document is not only a testament to the skill of 
    early American engravers but also a valuable artifact that captures a pivotal moment in the nation's history.`,
    image: '/high-spots/1818-declaration-of-independence.jpeg',
    button: {
      text: 'View Product',
      href: '/products/1818-declaration-of-independence-broadside-engraved-by-benjamin-owen-tyler/1qwnpg-y72mcz',
    },
  },
  {
    title:
      'The Peoples of Russia, or Description of the Customs and Costumes of the Various Nations of the Russian Empire. 2 Volume Folio Set.',
    text: `"The Peoples of Russia" is a comprehensive and visually stunning two-volume folio set that offers 
    an in-depth exploration of the diverse cultures, customs, and costumes of the various nations within the
     Russian Empire. This work provides a rich tapestry of illustrations and detailed descriptions, 
     showcasing the unique traditions and lifestyles`,
    image: '/high-spots/the-peoples-of-russia.jpg',
    button: {
      text: 'View Product',
      href: '/products/the-peoples-of-russia-or-description-of-the-customs-and-costumes-of-the-various-nations-of-the-russian-empire-2-volume-folio-set-/zjvkcu-i9c7hm',
    },
  },
];

/* -----------------------------
   Animated Block
------------------------------ */
interface AnimatedBlockProps {
  children: ReactNode;
  direction: 'left' | 'right';
  className?: string;
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
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* ---------------- HERO ---------------- */}
      <div
        className="relative h-[700px] w-full bg-cover bg-center"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,0,0,0.65), rgba(0,0,0,0.65)),
            url('/high-spots/dark-academia-books.webp')
          `,
        }}
      >
        <h1
          className="absolute top-8 sm:top-12 md:top-16 left-1/2 -translate-x-1/2 
               text-3xl sm:text-[2.25rem] md:text-[2.75rem] lg:text-[3.5rem]
               font-bold tracking-[0.05em] text-white text-center px-4 mb-6"
        >
          {getCurrentMonth()} High Spots
        </h1>

        <div className="h-full flex items-center justify-center text-center px-4">
          <p className="max-w-[48rem] text-[1.25rem] leading-[1.6] text-gray-200 -mt-3">
            Your insight into the most captivating and significant moments in literature, art, and
            culture. Discover the stories behind the masterpieces, the historical contexts that
            shaped them, and the enduring impact they have on our world today. Each month, we delve
            into new High Spots, offering you a deeper understanding and appreciation of the
            treasures that have defined human creativity and expression throughout history.
          </p>
        </div>
      </div>

      {/* ---------------- CONTENT ---------------- */}
      <section className="pb-24 px-[4vw] pt-24">
        <div className="w-full">
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
