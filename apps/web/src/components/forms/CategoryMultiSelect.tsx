'use client';

import { useState, useEffect, useRef } from 'react';
import { Category } from '@/types/Product';

interface CategoryMultiSelectProps {
  selectedCategories: number[];
  onChange: (categoryIds: number[]) => void;
  categories: Category[];
  label?: string;
  required?: boolean;
}

export default function CategoryMultiSelect({
  selectedCategories,
  onChange,
  categories,
  label = 'Categories',
  required = false,
}: CategoryMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const toggleCategory = (categoryId: number) => {
    if (selectedCategories.includes(categoryId)) {
      onChange(selectedCategories.filter((id) => id !== categoryId));
    } else {
      onChange([...selectedCategories, categoryId]);
    }
  };

  const getSelectedNames = () => {
    return categories
      .filter((cat) => selectedCategories.includes(cat.id))
      .map((cat) => cat.name)
      .join(', ');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full border border-gray-300 px-3 py-2 text-sm text-left focus:outline-none focus:ring-2 focus:ring-black bg-white flex justify-between items-center"
      >
        <span className={selectedCategories.length === 0 ? 'text-gray-400' : 'text-gray-900'}>
          {selectedCategories.length === 0
            ? 'Select categories...'
            : `${selectedCategories.length} selected: ${getSelectedNames()}`}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 shadow-lg max-h-60 overflow-auto">
          <div className="p-2 border-b border-gray-200">
            <input
              type="text"
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-black"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <div className="py-1">
            {filteredCategories.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">No categories found</div>
            ) : (
              filteredCategories.map((category) => (
                <label
                  key={category.id}
                  className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(category.id)}
                    onChange={() => toggleCategory(category.id)}
                    className="mr-2 h-4 w-4 text-black border-gray-300 focus:ring-black"
                  />
                  <span className="text-sm text-gray-900">{category.name}</span>
                </label>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
