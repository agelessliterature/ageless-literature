export default function HighSpotsPage() {
  return (
    <div className="min-h-screen">
      <div className="text-center py-8 sm:py-12 px-4">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">High Spots</h1>
        <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
          Your insight into the most captivating and significant moments in literature, art, and
          culture.
        </p>
      </div>

      <section>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Example High Spot Card */}
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
              <img
                src="/images/high-spot-example.jpg"
                alt="High Spot Example"
                className="w-full h-48 object-cover"
              />
              <div className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  The Enigmatic Smile of the Mona Lisa
                </h2>
                <p className="text-gray-700 mb-4">
                  Explore the mystery behind Leonardo da Vinci's masterpiece and its enduring
                  allure.
                </p>
                <a
                  href="/high-spots/mona-lisa-smile"
                  className="inline-block bg-black text-white px-4 py-2 text-sm font-semibold hover:bg-[#d4af37] hover:text-black hover:-translate-y-1 transition-all duration-300"
                >
                  Read More
                </a>
              </div>
            </div>
            {/* Additional High Spot Cards can be added here */}
          </div>
        </div>
      </section>
    </div>
  );
}
