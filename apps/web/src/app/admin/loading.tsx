import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center py-20">
          <FontAwesomeIcon
            icon={['fal', 'spinner-third']}
            spin
            className="text-6xl text-primary mb-6"
          />
          <p className="text-lg text-gray-600 font-medium">Loading admin dashboard...</p>
        </div>
      </div>
    </div>
  );
}
