import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Services | Ageless Literature',
  description: 'Explore our services for book collectors and sellers',
};

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 sm:py-12">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Our Services</h1>
          <p className="text-lg sm:text-xl text-gray-600">
            Professional services for book enthusiasts and sellers
          </p>
        </div>

        <div className="grid gap-6 sm:gap-8 sm:grid-cols-2 lg:grid-cols-3">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Book Appraisals</h3>
            <p className="text-gray-600">
              Professional appraisal services for rare and collectible books.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Authentication</h3>
            <p className="text-gray-600">
              Expert authentication and verification services for valuable editions.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Consulting</h3>
            <p className="text-gray-600">
              Personalized consulting for building and managing your collection.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Marketplace</h3>
            <p className="text-gray-600">
              Access to our curated marketplace of trusted booksellers.
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Educational Resources</h3>
            <p className="text-gray-600">Courses, guides, and tools for collectors and sellers.</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-3">Community</h3>
            <p className="text-gray-600">
              Connect with fellow enthusiasts and industry professionals.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
