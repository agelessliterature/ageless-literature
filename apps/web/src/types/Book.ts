export interface Book {
  id: number;
  vendorId: number;
  title: string;
  author: string;
  isbn?: string;
  description: any; // JSONB
  shortDescription?: string;
  price: number;
  salePrice?: number;
  quantity: number;
  condition: string;
  conditionNotes?: string;
  category?: string;
  categories?: Category[];
  publisher?: string;
  publicationYear?: number;
  edition?: string;
  language?: string;
  binding?: string;
  isSigned: boolean;
  status: string;
  images?: BookImage[];
  media?: BookMedia[];
  slug?: string;
  metaTitle?: string;
  metaDescription?: string;
  views?: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  vendor?: {
    id: number;
    shopName: string;
    shopUrl: string;
    logoUrl?: string;
  };
}

export interface BookMedia {
  id: number;
  bookId: number;
  imageUrl: string;
  thumbnailUrl?: string;
  displayOrder: number;
  isPrimary: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
}

export interface BookImage {
  url: string;
  publicId: string;
  thumbnail?: string;
}

export interface BookFormData {
  title: string;
  author: string;
  isbn?: string;
  description: string;
  shortDescription?: string;
  price: string;
  salePrice?: string;
  quantity: number;
  condition: string;
  conditionNotes?: string;
  category?: string;
  categoryIds?: number[];
  publisher?: string;
  publicationYear?: number;
  edition?: string;
  language?: string;
  binding?: string;
  isSigned: boolean;
  status: 'draft' | 'active' | 'sold';
  images: BookImage[];
  metaTitle?: string;
  metaDescription?: string;
}
