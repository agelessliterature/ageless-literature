export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
}

export interface Product {
  id: string;
  vendorId: number;
  title: string;
  description: any; // JSONB
  shortDescription?: string;
  price: number;
  salePrice?: number;
  condition: string;
  conditionNotes?: string;
  category: string;
  categories?: Category[];
  tags: string[];
  sku?: string;
  quantity: number;
  images: ProductImage[];
  slug: string;
  status: 'draft' | 'published' | 'archived';
  publishedAt?: Date | string;
  yearMade?: number;
  origin?: string;
  artist?: string;
  dimensions?: string;
  weight?: number;
  materials?: string;
  isSigned: boolean;
  isAuthenticated: boolean;
  metaTitle?: string;
  metaDescription?: string;
  views: number;
  favoriteCount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  vendor?: {
    id: number;
    shopName: string;
    shopUrl: string;
    logoUrl?: string;
  };
}

export interface ProductImage {
  url: string;
  publicId: string;
  thumbnail?: string;
}

export interface ProductFormData {
  title: string;
  description: string;
  shortDescription?: string;
  price: string;
  salePrice?: string;
  condition?: string;
  conditionNotes?: string;
  category?: string;
  categoryIds?: number[];
  tags: string[];
  sku?: string;
  quantity: number;
  images: ProductImage[];
  status: 'draft' | 'published';
  yearMade?: number;
  origin?: string;
  artist?: string;
  dimensions?: string;
  weight?: number;
  materials?: string;
  isSigned: boolean;
  isAuthenticated: boolean;
  metaTitle?: string;
  metaDescription?: string;
}
