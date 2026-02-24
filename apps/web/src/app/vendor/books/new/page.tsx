'use client';

import BookForm from '@/components/forms/BookForm';

export default function NewBookPage() {
  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-xl sm:text-3xl font-bold mb-4 sm:mb-8">Add New Book</h1>
        <BookForm />
      </div>
    </div>
  );
}
