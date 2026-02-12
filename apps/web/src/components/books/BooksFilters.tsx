'use client';

import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import api from '@/lib/api';

interface FilterState {
  search: string;
  category: string;
  author: string;
  minPrice: string;
  maxPrice: string;
  sortBy: string;
  sortOrder: string;
}

interface BooksFiltersProps {
  filters: FilterState;
  onChange: (filters: Partial<FilterState>) => void;
  onClear: () => void;
}

interface Category {
  id: number;
  name: string;
  slug: string;
}

export function BooksFilters({ filters, onChange, onClear }: BooksFiltersProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.get<{ success: boolean; data: Category[] }>('/categories');
        if (response.data.success) {
          setCategories(response.data.data);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoadingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  const hasActiveFilters =
    filters.category || filters.author || filters.minPrice || filters.maxPrice;

  const handleSortChange = (value: string) => {
    // Map sort option to sortBy and sortOrder
    switch (value) {
      case 'newest':
        onChange({ sortBy: 'createdAt', sortOrder: 'DESC' });
        break;
      case 'oldest':
        onChange({ sortBy: 'createdAt', sortOrder: 'ASC' });
        break;
      case 'price-low':
        onChange({ sortBy: 'price', sortOrder: 'ASC' });
        break;
      case 'price-high':
        onChange({ sortBy: 'price', sortOrder: 'DESC' });
        break;
      case 'title':
        onChange({ sortBy: 'title', sortOrder: 'ASC' });
        break;
      case 'menu-order':
        onChange({ sortBy: 'menu_order', sortOrder: 'ASC' });
        break;
      default:
        onChange({ sortBy: 'menu_order', sortOrder: 'ASC' });
    }
  };

  // Determine current sort value from sortBy and sortOrder
  const getCurrentSortValue = () => {
    if (filters.sortBy === 'menu_order') return 'menu-order';
    if (filters.sortBy === 'createdAt' && filters.sortOrder === 'DESC') return 'newest';
    if (filters.sortBy === 'createdAt' && filters.sortOrder === 'ASC') return 'oldest';
    if (filters.sortBy === 'price' && filters.sortOrder === 'ASC') return 'price-low';
    if (filters.sortBy === 'price' && filters.sortOrder === 'DESC') return 'price-high';
    if (filters.sortBy === 'title') return 'title';
    return 'menu-order';
  };

  return (
    <div className="mt-4 pt-4 border-t border-gray-200 animate-in slide-in-from-top duration-300">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Category Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select
            value={filters.category}
            onChange={(e) => onChange({ category: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
            disabled={loadingCategories}
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {/* Author Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Author</label>
          <input
            type="text"
            value={filters.author}
            onChange={(e) => onChange({ author: e.target.value })}
            placeholder="Search by author..."
            className="w-full px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>

        {/* Price Range */}
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Min Price</label>
            <input
              type="number"
              value={filters.minPrice}
              onChange={(e) => onChange({ minPrice: e.target.value })}
              placeholder="$0"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Price</label>
            <input
              type="number"
              value={filters.maxPrice}
              onChange={(e) => onChange({ maxPrice: e.target.value })}
              placeholder="$10,000"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
        </div>

        {/* Sort By */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
          <select
            value={getCurrentSortValue()}
            onChange={(e) => handleSortChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 focus:ring-2 focus:ring-primary focus:border-primary"
          >
            <option value="menu-order">Featured</option>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="title">Title: A to Z</option>
          </select>
        </div>
      </div>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <div className="mt-4 flex justify-center md:justify-end">
          <button
            onClick={onClear}
            className="w-full md:w-auto px-6 py-3 md:px-4 md:py-2 text-sm bg-red-50 text-red-600 hover:text-red-800 hover:bg-red-100 transition-colors flex items-center justify-center gap-2 font-medium border border-red-200 hover:border-red-300"
            style={{ borderRadius: '0.5rem' }}
          >
            <FontAwesomeIcon icon={['fal', 'times-circle']} />
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  );
}
