'use client';

import { useState } from 'react';
import Link from 'next/link';

interface AccordionItemProps {
  question: string;
  answer: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
}

function AccordionItem({ question, answer, isOpen, onToggle }: AccordionItemProps) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden mb-3">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 text-left bg-white hover:bg-gray-50 transition-colors flex items-center justify-between"
      >
        <h3 className="text-lg font-semibold text-gray-900 pr-4">{question}</h3>
        <svg
          className={`w-5 h-5 text-primary transform transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="text-gray-700 leading-relaxed">{answer}</div>
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());

  const toggleItem = (id: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-primary mb-6">
            Frequently Asked Questions
          </h1>
          <p className="text-xl text-gray-600">
            Find answers to common questions about Ageless Literature
          </p>
        </div>

        {/* About Us Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-primary mb-6 pb-4 border-b-2 border-secondary">
            About Us
          </h2>

          <AccordionItem
            question="What is Ageless Literature?"
            isOpen={openItems.has('about-1')}
            onToggle={() => toggleItem('about-1')}
            answer={
              <>
                <p className="mb-4">
                  Ageless Literature is the premier online marketplace for trusted booksellers and
                  premium rare, collectible books, ephemera, and historical documents. We are also a
                  social community where booksellers, collectors, and book lovers across the globe
                  can connect with each other, learn, and interact in a digital ecosystem around the
                  preservation of literature.
                </p>
                <p>
                  Our mission is to preserve history and literature while creating a marketplace
                  that excites and encourages new and previous generations to see the deep value in
                  rare books, especially in the age of technology.
                </p>
              </>
            }
          />

          <AccordionItem
            question="What makes Ageless Literature different?"
            isOpen={openItems.has('about-2')}
            onToggle={() => toggleItem('about-2')}
            answer={
              <>
                <p className="mb-4">
                  Only trusted sellers are invited or approved to create an account on our platform,
                  this means quality-control and a better experience for collectors and customers.
                  We require high quality images, so the site itself is more attractive and allows
                  collectors to buy online with confidence.
                </p>
                <p className="mb-4">
                  We do <strong>not</strong> charge any listing fees, monthly fees, or signup fees
                  for booksellers. We are also committed to providing excellent support for
                  booksellers, as our founder began as a bookseller and understands the challenges
                  and opportunities in the rare book market.
                </p>
              </>
            }
          />

          <AccordionItem
            question="What is the Rare Book Researcher?"
            isOpen={openItems.has('about-3')}
            onToggle={() => toggleItem('about-3')}
            answer={
              <p>
                The Rare Book Researcher is an AI-powered research tool for book lovers. Developed
                by Ageless Literature to educate and empower seasoned collectors as well as curious
                newcomers. It only pulls from trusted academic sources. Ask it any question about
                books, history, or your favorite authors and it will give you an intelligent,
                helpful answer in seconds!
              </p>
            }
          />
        </section>

        {/* Events Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-primary mb-6 pb-4 border-b-2 border-secondary">
            Events
          </h2>

          <AccordionItem
            question="Upcoming Events"
            isOpen={openItems.has('events-1')}
            onToggle={() => toggleItem('events-1')}
            answer={
              <div>
                <p className="mb-2">
                  <strong>Empire State Rare Book and Print Fair</strong>
                </p>
                <p className="mb-2">
                  We are the presenting sponsor for the Empire State Rare Book and Print Fair at NYC
                  Grand Central Terminal. Over 30 rare book, print and ephemera exhibitors from
                  across the world. Items to fit all budgets.
                </p>
              </div>
            }
          />

          <AccordionItem
            question="Photos from Sponsoring The Capital Book Fair 2025 in Washington D.C."
            isOpen={openItems.has('events-2')}
            onToggle={() => toggleItem('events-2')}
            answer={
              <p>
                Ageless Literature was proud to sponsor The Capital Book Fair 2025 in Washington
                D.C., bringing together rare book dealers, collectors, and enthusiasts from across
                the country.
              </p>
            }
          />
        </section>

        {/* Sellers Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-primary mb-6 pb-4 border-b-2 border-secondary">
            Sellers
          </h2>

          <AccordionItem
            question="Why should I sell on Ageless Literature?"
            isOpen={openItems.has('sellers-1')}
            onToggle={() => toggleItem('sellers-1')}
            answer={
              <p>
                Selling on Ageless Literature offers an opportunity to be a part of something bigger
                than just a marketplace. Not only does it increase your exposure and potential for
                premium online sales, but it also welcomes you onto a platform where preservation of
                literature and history is of utmost importance. We are a new company with our own
                marketing budget, which you get to benefit from when you join! Other benefits
                include being positioned as a top, trusted bookseller and increasing opportunities
                to meet new long-term collectors from all over the globe.
              </p>
            }
          />

          <AccordionItem
            question="What makes my book rare or collectible?"
            isOpen={openItems.has('sellers-2')}
            onToggle={() => toggleItem('sellers-2')}
            answer={
              <p>
                A rare or collectible book typically has characteristics such as first edition
                status, limited print runs, association with historical events or notable
                individuals, exceptional condition, unique illustrations or bindings, author
                signatures or inscriptions, or cultural significance. Age alone doesn't necessarily
                make a book rare—it's the combination of scarcity, demand, condition, and historical
                importance that determines collectibility.
              </p>
            }
          />

          <AccordionItem
            question="Does Ageless Literature take commission? How much?"
            isOpen={openItems.has('sellers-3')}
            onToggle={() => toggleItem('sellers-3')}
            answer={
              <div>
                <p className="mb-3 font-semibold">Our commission structure:</p>
                <ul className="space-y-2">
                  <li>
                    <strong>Books under $10K:</strong> 8% + 3% Credit Card Fee
                  </li>
                  <li>
                    <strong>Books over $10,000:</strong> 5% + wire fee commission*, if purchased
                    with a card the 3% CC Fee will be applied instead of the wire fee.
                  </li>
                  <li>
                    <strong>Books $50–$100K:</strong> 4.5% + wire fee*
                  </li>
                  <li>
                    <strong>Books $100K+:</strong> 4% + wire fee*
                  </li>
                </ul>
                <p className="mt-3 text-sm text-gray-600">
                  *Wire fees are typically $30–60 per transaction
                </p>
              </div>
            }
          />

          <AccordionItem
            question="Can I still sell on my own website?"
            isOpen={openItems.has('sellers-4')}
            onToggle={() => toggleItem('sellers-4')}
            answer={
              <p>
                Yes – we do <strong>not</strong> demand exclusivity to sell on our platform. You are
                free to maintain your own website and sell through other channels while benefiting
                from the additional exposure Ageless Literature provides.
              </p>
            }
          />

          <AccordionItem
            question="Is it possible to upload my existing online inventory?"
            isOpen={openItems.has('sellers-5')}
            onToggle={() => toggleItem('sellers-5')}
            answer={
              <p>
                Yes! We have a mass import feature that allows you to take your existing inventory
                from whatever platform you are using and upload it into our site. We are happy to
                assist you with this process.
              </p>
            }
          />

          <AccordionItem
            question="How can I sell on Ageless Literature?"
            isOpen={openItems.has('sellers-6')}
            onToggle={() => toggleItem('sellers-6')}
            answer={
              <p>
                To register as a vendor, click below and fill out the application. If you are
                approved, you can add a profile picture, store banner, and start uploading your
                inventory.{' '}
                <Link
                  href="/vendor-registration"
                  className="text-secondary hover:underline font-semibold"
                >
                  Vendor Registration
                </Link>
              </p>
            }
          />

          <AccordionItem
            question="What are your requirements for listings?"
            isOpen={openItems.has('sellers-7')}
            onToggle={() => toggleItem('sellers-7')}
            answer={
              <div>
                <p className="mb-3 font-semibold">Minimum Requirements:</p>
                <p className="mb-2">
                  <strong>High Quality Images (minimum of 3):</strong>
                </p>
                <ul className="list-disc list-inside ml-4 mb-3">
                  <li>Front cover</li>
                  <li>Copyright page</li>
                  <li>Back cover</li>
                  <li>Any unique qualities/illustrations</li>
                  <li>Any flaws or defects</li>
                </ul>
                <p className="mb-2">
                  <strong>Proper Book Description:</strong>
                </p>
                <ul className="list-disc list-inside ml-4 mb-3">
                  <li>Title</li>
                  <li>Author</li>
                  <li>Edition</li>
                  <li>Publisher</li>
                  <li>Year of publication</li>
                  <li>Correct condition grade</li>
                  <li>Brief description of the book's significance</li>
                </ul>
                <p className="mb-2">
                  <strong>Condition Standards:</strong>
                </p>
                <ul className="list-disc list-inside ml-4">
                  <li>
                    <strong>AS NEW/FINE:</strong> Perfect condition, no flaws
                  </li>
                  <li>
                    <strong>NEAR FINE:</strong> Almost perfect, couple very small flaws
                  </li>
                  <li>
                    <strong>VERY GOOD+:</strong> Shows some signs of wear but still excellent
                  </li>
                  <li>
                    <strong>VERY GOOD:</strong> Minor wear, overall good condition
                  </li>
                  <li>
                    <strong>GOOD:</strong> Average used condition with noticeable wear
                  </li>
                  <li>
                    <strong>POOR/READING COPY:</strong> Significant wear, primarily for reading
                  </li>
                </ul>
              </div>
            }
          />
        </section>

        {/* Shipping Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-primary mb-6 pb-4 border-b-2 border-secondary">
            Shipping
          </h2>

          <AccordionItem
            question="How much is shipping?"
            isOpen={openItems.has('shipping-1')}
            onToggle={() => toggleItem('shipping-1')}
            answer={
              <p>
                Shipping cost varies by listing. Please email the bookseller or chat with them
                directly through the live chat feature if delivery charges are not clearly specified
                on the store listing.
              </p>
            }
          />

          <AccordionItem
            question="How long will delivery take?"
            isOpen={openItems.has('shipping-2')}
            onToggle={() => toggleItem('shipping-2')}
            answer={
              <p>
                A delivery is generally made via insured postal service, UPS, or Federal Express.
                Delivery times vary based upon the carrier. You can track your package through the
                email sent from the bookseller.
              </p>
            }
          />

          <AccordionItem
            question="Do I receive an invoice for my order?"
            isOpen={openItems.has('shipping-3')}
            onToggle={() => toggleItem('shipping-3')}
            answer={
              <p>
                Yes, invoices are sent at time of purchase to the email address you have on file.
              </p>
            }
          />

          <AccordionItem
            question="I have a question for the seller"
            isOpen={openItems.has('shipping-4')}
            onToggle={() => toggleItem('shipping-4')}
            answer={
              <p>
                All sellers can be reached directly by clicking on the "Live chat" button located on
                the book's listing page. This will create a direct chat session between you and the
                seller where you can ask additional questions. You can also contact the seller via
                their email which can usually be found on their store page.
              </p>
            }
          />
        </section>

        {/* Purchase Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-primary mb-6 pb-4 border-b-2 border-secondary">
            Purchase
          </h2>

          <AccordionItem
            question="I would like to track my package"
            isOpen={openItems.has('purchase-1')}
            onToggle={() => toggleItem('purchase-1')}
            answer={
              <p>
                Use the tracking number provided by the bookseller in your shipping confirmation
                email to track your package with the carrier (USPS, UPS, FedEx, etc.).
              </p>
            }
          />

          <AccordionItem
            question="What is the wishlist?"
            isOpen={openItems.has('purchase-2')}
            onToggle={() => toggleItem('purchase-2')}
            answer={
              <p>
                A wishlist is a collection of rare books that you are interested in purchasing or
                want to save for reference in the future. You can have a notification sent to you if
                a rare book in your wishlist becomes available for purchase on our site.
              </p>
            }
          />

          <AccordionItem
            question="What should I do if I receive a damaged or wrong product?"
            isOpen={openItems.has('purchase-3')}
            onToggle={() => toggleItem('purchase-3')}
            answer={
              <p>
                Please contact the bookseller directly first. Not satisfied or need additional
                assistance? Contact us at{' '}
                <a
                  href="mailto:support@agelessliterature.com"
                  className="text-secondary hover:underline font-semibold"
                >
                  support@agelessliterature.com
                </a>
              </p>
            }
          />

          <AccordionItem
            question="Can I change or cancel my order?"
            isOpen={openItems.has('purchase-4')}
            onToggle={() => toggleItem('purchase-4')}
            answer={
              <p>
                If the items have not shipped yet, it may still be possible to change or cancel the
                order. Please contact the bookseller directly as soon as possible.
              </p>
            }
          />
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-br from-primary/5 to-secondary/5 p-12 text-center mt-16 rounded-lg">
          <h2 className="text-3xl font-bold text-primary mb-6">Still Have Questions?</h2>
          <p className="text-gray-700 mb-8 text-lg">
            Our support team is here to help you with any inquiries
          </p>
          <a
            href="mailto:support@agelessliterature.com"
            className="inline-block bg-primary hover:bg-primary-dark text-white px-10 py-4 font-semibold transition-all duration-300 hover:scale-105 rounded"
          >
            Contact Support
          </a>
        </section>
      </div>
    </div>
  );
}
