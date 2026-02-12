import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Accessibility Statement | Ageless Literature',
  description: 'Our commitment to accessibility for all users',
};

export default function AccessibilityPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <h1 className="text-4xl font-bold mb-6">Accessibility Statement</h1>
      <div className="prose prose-lg max-w-none">
        <p className="text-lg mb-4">
          Ageless Literature is committed to ensuring digital accessibility for people with
          disabilities.
        </p>
        <h2 className="text-2xl font-semibold mt-8 mb-4">Contact</h2>
        <p>Email: accessibility@agelessliterature.com</p>
      </div>
    </div>
  );
}
