import Link from 'next/link';

export const metadata = {
  title: 'FAQ - Ageless Literature',
  description: 'Frequently Asked Questions about Ageless Literature',
};

export default function FAQPage() {
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
          <h2 className="text-3xl font-bold text-primary mb-8 pb-4 border-b-2 border-secondary">
            About Us
          </h2>

          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-bold text-primary mb-4">What is Ageless Literature?</h3>
              <p className="text-gray-700 leading-relaxed">
                Ageless Literature is the premier online marketplace for trusted booksellers and
                premium rare, collectible books, ephemera, and historical documents. We are also a
                social community where booksellers, collectors, and book lovers across the globe can
                connect with each other, learn, and interact in a digital ecosystem around the
                preservation of literature.
              </p>
              <p className="text-gray-700 leading-relaxed mt-4">
                Our mission is to preserve history and literature while creating a marketplace that
                excites and encourages new and previous generations to see the deep value in rare
                books, especially in the age of technology.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-primary mb-4">
                What makes Ageless Literature different from other marketplaces?
              </h3>
              <p className="text-gray-700 leading-relaxed">
                Unlike other marketplaces, Ageless Literature combines premium marketplace
                functionality with a thriving social community. We offer exclusive access to
                research tools, expert courses, and direct connections with trusted booksellers
                worldwide. Our platform is built specifically for rare book collectors and
                enthusiasts.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-primary mb-4">
                What is the Rare Book Researcher?
              </h3>
              <p className="text-gray-700 leading-relaxed">
                The Rare Book Researcher is an exclusive tool available to our members that provides
                in-depth information about rare books, including provenance, historical
                significance, market values, and authentication resources. It's an invaluable
                resource for serious collectors and investors.
              </p>
            </div>
          </div>
        </section>

        {/* Getting Started Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-primary mb-8 pb-4 border-b-2 border-secondary">
            Getting Started
          </h2>

          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-bold text-primary mb-4">How do I create an account?</h3>
              <p className="text-gray-700 leading-relaxed">
                Click on the "Sign in/Join" link in the header navigation. You can register as
                either a collector or a bookseller. Fill out the registration form with your
                information, and you'll receive a confirmation email to verify your account.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-primary mb-4">
                Is membership required to browse?
              </h3>
              <p className="text-gray-700 leading-relaxed">
                No, you can browse our marketplace without creating an account. However, to purchase
                books, participate in auctions, or access member-exclusive features, you'll need to
                create a free account.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-primary mb-4">
                What are the membership benefits?
              </h3>
              <p className="text-gray-700 leading-relaxed">Members enjoy exclusive access to:</p>
              <ul className="list-disc list-inside text-gray-700 ml-4 mt-2 space-y-2">
                <li>Expert-led courses on rare book collecting</li>
                <li>The Rare Book Researcher tool</li>
                <li>Early access to auctions and new listings</li>
                <li>Exclusive discounts from featured booksellers</li>
                <li>Community forums and collector networking</li>
                <li>Priority customer support</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Buying & Selling Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-primary mb-8 pb-4 border-b-2 border-secondary">
            Buying & Selling
          </h2>

          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-bold text-primary mb-4">How do I purchase a book?</h3>
              <p className="text-gray-700 leading-relaxed">
                Browse our collection, select the book you want, and click "Add to Cart." You can
                purchase from multiple sellers in a single transaction. Checkout securely with your
                preferred payment method.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-primary mb-4">How do auctions work?</h3>
              <p className="text-gray-700 leading-relaxed">
                Our featured auctions allow you to bid on extraordinary rare books. Each auction has
                a start time, end time, and minimum bid increment. The highest bidder when the
                auction closes wins the item. Members receive notifications before auctions end.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-primary mb-4">Can I become a bookseller?</h3>
              <p className="text-gray-700 leading-relaxed">
                Yes! We welcome qualified booksellers to our platform. Apply through our{' '}
                <Link
                  href="/vendor-registration"
                  className="text-secondary hover:underline font-semibold"
                >
                  Bookseller Registration
                </Link>{' '}
                page. Our team reviews all applications to ensure quality and authenticity.
              </p>
            </div>
          </div>
        </section>

        {/* Support Section */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-primary mb-8 pb-4 border-b-2 border-secondary">
            Customer Support
          </h2>

          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-bold text-primary mb-4">How do I contact support?</h3>
              <p className="text-gray-700 leading-relaxed">
                Email us at{' '}
                <a
                  href="mailto:support@agelessliterature.com"
                  className="text-secondary hover:underline font-semibold"
                >
                  support@agelessliterature.com
                </a>{' '}
                or use our contact form. Our team typically responds within 24 hours.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-bold text-primary mb-4">What is your return policy?</h3>
              <p className="text-gray-700 leading-relaxed">
                Return policies vary by seller. Most booksellers accept returns within 2-4 weeks if
                the item is not as described. See our{' '}
                <Link href="/refunds" className="text-secondary hover:underline font-semibold">
                  Refund and Returns Policy
                </Link>{' '}
                for complete details.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-br from-primary/5 to-secondary/5 p-12 text-center mt-16">
          <h2 className="text-3xl font-bold text-primary mb-6">Still Have Questions?</h2>
          <p className="text-gray-700 mb-8 text-lg">
            Our support team is here to help you with any inquiries
          </p>
          <a
            href="mailto:support@agelessliterature.com"
            className="inline-block bg-primary hover:bg-primary-dark text-white px-10 py-4 font-semibold transition-all duration-300 hover:scale-105"
          >
            Contact Support
          </a>
        </section>
      </div>
    </div>
  );
}
