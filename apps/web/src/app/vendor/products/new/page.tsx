'use client';

import ProductForm from '@/components/forms/ProductForm';

export default function NewProductPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Add New Collectible</h1>
        <ProductForm />
      </div>
    </div>
  );
}
