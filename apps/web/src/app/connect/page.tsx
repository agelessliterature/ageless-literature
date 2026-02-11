import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Connect | Ageless Literature',
  description: 'Connect with fellow book lovers and collectors',
};

export default function ConnectPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Connect</h1>
          <p className="text-xl text-gray-600 mb-8">Join our community of book enthusiasts</p>
          <div className="bg-white rounded-lg shadow-md p-8">
            <p className="text-gray-600">
              This page is currently under development. Soon you'll be able to connect with fellow
              collectors, join discussions, and share your passion for rare books.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
