export const metadata = {
  title: 'Refund & Returns Policy - Ageless Literature',
  description: 'Refund and Returns Policy for Ageless Literature marketplace',
};

export default function RefundsPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-primary mb-6">
            Refund and Returns Policy
          </h1>
          <p className="text-gray-600 text-lg">
            Understanding our return process for rare and collectible books
          </p>
        </div>

        {/* Introduction */}
        <section className="mb-12">
          <div className="bg-secondary/10 border-l-4 border-secondary p-6">
            <p className="text-gray-700 leading-relaxed">
              While individual seller policies may vary slightly, most booksellers on our platform
              typically allow returns within 2 to 4 weeks of purchase, provided the following
              conditions are met:
            </p>
          </div>
        </section>

        {/* Return Conditions */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-primary mb-6 pb-4 border-b-2 border-secondary">
            Return Conditions
          </h2>
          <ul className="space-y-4 text-gray-700">
            <li className="flex gap-4">
              <span className="text-secondary text-2xl font-bold">•</span>
              <span>
                The buyer contacts the seller before re-shipping the item to obtain return approval.
              </span>
            </li>
            <li className="flex gap-4">
              <span className="text-secondary text-2xl font-bold">•</span>
              <span>The item is returned in the same condition as it was received.</span>
            </li>
            <li className="flex gap-4">
              <span className="text-secondary text-2xl font-bold">•</span>
              <span>
                The return is initiated within the timeframe specified in the seller's policy
                (usually 14 to 28 days from the date of receipt).
              </span>
            </li>
          </ul>
        </section>

        {/* How to Request a Return */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-primary mb-6 pb-4 border-b-2 border-secondary">
            How to Request a Return
          </h2>
          <p className="text-gray-700 leading-relaxed mb-6">
            If you would like to request a refund or return:
          </p>
          <ol className="space-y-4 text-gray-700">
            <li className="flex gap-4">
              <span className="flex-shrink-0 text-3xl bg-secondary text-primary font-bold  flex items-center justify-center">
                1
              </span>
              <span>
                <strong>Contact the seller directly</strong> using the messaging feature on the
                Ageless Literature platform, or by using the contact information provided at the
                time of purchase.
              </span>
            </li>
            <li className="flex gap-4">
              <span className="flex-shrink-0 text-3xl bg-secondary text-primary font-bold  flex items-center justify-center">
                2
              </span>
              <span>
                <strong>Include your order details</strong>, the reason for the return, and any
                supporting images if the item was received damaged or not as described.
              </span>
            </li>
            <li className="flex gap-4">
              <span className="flex-shrink-0 text-3xl bg-secondary text-primary font-bold  flex items-center justify-center">
                3
              </span>
              <span>
                <strong>Wait for the seller's confirmation</strong> and return instructions before
                shipping the book back.
              </span>
            </li>
          </ol>
          <div className="mt-6 bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <p className="text-gray-700">
              <strong>Please note:</strong> Returns shipped without prior communication may not be
              accepted.
            </p>
          </div>
        </section>

        {/* Non-Returnable Items */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-primary mb-6 pb-4 border-b-2 border-secondary">
            Non-Returnable Items
          </h2>
          <p className="text-gray-700 leading-relaxed mb-6">
            Certain items may not be eligible for return, including:
          </p>
          <ul className="space-y-3 text-gray-700">
            <li className="flex gap-4">
              <span className="text-red-500 text-2xl font-bold">✗</span>
              <span>Books marked as final sale or non-returnable by the seller</span>
            </li>
            <li className="flex gap-4">
              <span className="text-red-500 text-2xl font-bold">✗</span>
              <span>Items damaged after delivery</span>
            </li>
            <li className="flex gap-4">
              <span className="text-red-500 text-2xl font-bold">✗</span>
              <span>Returns requested outside the accepted window</span>
            </li>
          </ul>
        </section>

        {/* Refund Processing */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-primary mb-6 pb-4 border-b-2 border-secondary">
            Refund Processing
          </h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Once your return is received and inspected by the seller, you will be notified via email
            about the approval or rejection of your refund.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            If approved, your refund will be processed, and a credit will automatically be applied
            to your original method of payment within 5-10 business days.
          </p>
          <p className="text-gray-700 leading-relaxed">
            If you haven't received a refund within this timeframe, please check your bank account
            again. Then contact your credit card company, as it may take some time before your
            refund is officially posted. If you've done all of this and still have not received your
            refund, please contact us at{' '}
            <a
              href="mailto:support@agelessliterature.com"
              className="text-secondary hover:underline font-semibold"
            >
              support@agelessliterature.com
            </a>
            .
          </p>
        </section>

        {/* Shipping Costs */}
        <section className="mb-12">
          <h2 className="text-3xl font-bold text-primary mb-6 pb-4 border-b-2 border-secondary">
            Return Shipping Costs
          </h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            You will be responsible for paying your own shipping costs for returning your item
            unless the item was defective or not as described. Shipping costs are non-refundable.
          </p>
          <p className="text-gray-700 leading-relaxed">
            If you receive a refund, the cost of return shipping may be deducted from your refund,
            depending on the seller's policy.
          </p>
        </section>

        {/* Contact Section */}
        <section className="bg-gradient-to-br from-primary/5 to-secondary/5 p-12 text-center">
          <h2 className="text-3xl font-bold text-primary mb-6">Need Help with a Return?</h2>
          <p className="text-gray-700 mb-8 text-lg leading-relaxed">
            Contact us at{' '}
            <a
              href="mailto:support@agelessliterature.com"
              className="text-secondary hover:underline font-semibold"
            >
              support@agelessliterature.com
            </a>{' '}
            for additional questions related to refunds and returns.
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
