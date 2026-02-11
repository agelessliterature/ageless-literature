import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Book, PaginatedResponse, ApiResponse } from '@/types';

// Fetch all books with pagination and filters
interface BooksParams {
  page?: number;
  limit?: number;
  genre?: string;
  condition?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  vendorId?: number;
  featured?: boolean;
}

export const useBooks = (params: BooksParams = {}) => {
  return useQuery({
    queryKey: ['books', params],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Book>>('/books', { params });
      return data;
    },
  });
};

// Fetch single book by ID or slug
export const useBook = (idOrSlug: string | number) => {
  return useQuery({
    queryKey: ['book', idOrSlug],
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<Book>>(`/books/${idOrSlug}`);
      return data.data;
    },
    enabled: !!idOrSlug,
  });
};

// Create a new book (vendor only)
export const useCreateBook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookData: Partial<Book>) => {
      const { data } = await api.post<ApiResponse<Book>>('/books', bookData);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });
};

// Update an existing book (vendor only)
export const useUpdateBook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, bookData }: { id: number; bookData: Partial<Book> }) => {
      const { data } = await api.put<ApiResponse<Book>>(`/books/${id}`, bookData);
      return data.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['book', variables.id] });
    },
  });
};

// Delete a book (vendor only)
export const useDeleteBook = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.delete<ApiResponse<void>>(`/books/${id}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });
};
