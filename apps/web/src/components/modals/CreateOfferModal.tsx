'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import { CloudinaryImage } from '@/components/ui/CloudinaryImage';
import { getApiUrl } from '@/lib/api';

interface CreateOfferModalProps {
  onClose: () => void;
  onSuccess: () => void;
  preselectedItem?: {
    type: 'book' | 'product';
    id: number;
    title: string;
    price: string;
  };
}

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface Item {
  id: number;
  title: string;
  price: string;
  media?: { imageUrl: string }[];
  images?: string[];
}

export default function CreateOfferModal({
  onClose,
  onSuccess,
  preselectedItem,
}: CreateOfferModalProps) {
  const { data: session } = useSession();
  const [step, setStep] = useState(preselectedItem ? 2 : 1);
  const [itemType, setItemType] = useState<'book' | 'product'>(preselectedItem?.type || 'book');
  const [selectedItem, setSelectedItem] = useState<Item | null>(
    preselectedItem
      ? { id: preselectedItem.id, title: preselectedItem.title, price: preselectedItem.price }
      : null,
  );
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [offerPrice, setOfferPrice] = useState('');
  const [message, setMessage] = useState('');
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [itemSearch, setItemSearch] = useState('');

  // Fetch vendor's items
  const { data: itemsData, isLoading: itemsLoading } = useQuery({
    queryKey: ['vendor-items', itemType, itemSearch],
    queryFn: async () => {
      const endpoint = itemType === 'book' ? 'api/vendor/products' : 'api/vendor/collectibles';
      const params = new URLSearchParams({
        limit: '50',
        ...(itemSearch && { search: itemSearch }),
      });
      const res = await fetch(getApiUrl(`${endpoint}?${params}`), {
        headers: { Authorization: `Bearer ${session?.accessToken}` },
      });
      if (!res.ok) throw new Error('Failed to fetch items');
      const result = await res.json();
      return result.data?.products || result.data || [];
    },
    enabled: !!session && step === 1,
  });

  // Search users
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['search-users', userSearch],
    queryFn: async () => {
      if (userSearch.length < 2) return [];
      const res = await fetch(
        getApiUrl(`api/vendor/offers/search-users?q=${encodeURIComponent(userSearch)}`),
        {
          headers: { Authorization: `Bearer ${session?.accessToken}` },
        },
      );
      if (!res.ok) throw new Error('Failed to search users');
      const result = await res.json();
      return result.data || [];
    },
    enabled: !!session && userSearch.length >= 2,
  });

  // Create offer mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(getApiUrl('api/vendor/offers'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.accessToken}`,
        },
        body: JSON.stringify({
          targetUserId: selectedUser?.id,
          itemType,
          itemId: selectedItem?.id,
          offerPrice: parseFloat(offerPrice),
          message: message || null,
          expiresInDays,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to create offer');
      }
      return res.json();
    },
    onSuccess: () => {
      onSuccess();
    },
  });

  const getItemImage = (item: Item) => {
    if (item.media?.[0]?.imageUrl) return item.media[0].imageUrl;
    if (item.images?.[0]) return item.images[0];
    return null;
  };

  const discount =
    selectedItem && offerPrice
      ? Math.round((1 - parseFloat(offerPrice) / parseFloat(selectedItem.price)) * 100)
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4 rounded-lg">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold text-primary">Create Custom Offer</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FontAwesomeIcon icon={['fal', 'times']} className="text-xl" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Progress Indicator */}
          <div className="flex items-center justify-center mb-6">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-primary text-white' : 'bg-gray-200'}`}
            >
              1
            </div>
            <div className={`w-16 h-1 ${step >= 2 ? 'bg-primary' : 'bg-gray-200'}`} />
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-primary text-white' : 'bg-gray-200'}`}
            >
              2
            </div>
            <div className={`w-16 h-1 ${step >= 3 ? 'bg-primary' : 'bg-gray-200'}`} />
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-primary text-white' : 'bg-gray-200'}`}
            >
              3
            </div>
          </div>

          {/* Step 1: Select Item */}
          {step === 1 && (
            <div>
              <h3 className="font-semibold mb-4">Step 1: Select Item</h3>

              {/* Item Type Toggle */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setItemType('book')}
                  className={`flex-1 py-2 px-4 border ${itemType === 'book' ? 'bg-primary text-white border-primary' : 'border-gray-300'}`}
                >
                  <FontAwesomeIcon icon={['fal', 'book']} className="mr-2" />
                  Books
                </button>
                <button
                  onClick={() => setItemType('product')}
                  className={`flex-1 py-2 px-4 border ${itemType === 'product' ? 'bg-primary text-white border-primary' : 'border-gray-300'}`}
                >
                  <FontAwesomeIcon icon={['fal', 'box']} className="mr-2" />
                  Collectibles
                </button>
              </div>

              {/* Search */}
              <div className="relative mb-4">
                <FontAwesomeIcon
                  icon={['fal', 'search']}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Search items..."
                  value={itemSearch}
                  onChange={(e) => setItemSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Items List */}
              <div className="max-h-64 overflow-y-auto border border-gray-200 rounded">
                {itemsLoading ? (
                  <div className="p-4 text-center text-gray-500">Loading...</div>
                ) : itemsData?.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">No items found</div>
                ) : (
                  itemsData?.map((item: Item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setSelectedItem(item);
                        setStep(2);
                      }}
                      className={`w-full flex items-center gap-3 p-3 border-b last:border-b-0 hover:bg-gray-50 text-left ${
                        selectedItem?.id === item.id ? 'bg-primary/10' : ''
                      }`}
                    >
                      <div className="w-12 h-12 bg-gray-100 flex-shrink-0">
                        {getItemImage(item) ? (
                          <CloudinaryImage
                            src={getItemImage(item)!}
                            alt={item.title}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FontAwesomeIcon
                              icon={['fal', itemType === 'book' ? 'book' : 'box']}
                              className="text-gray-400"
                            />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{item.title}</p>
                        <p className="text-sm text-gray-500">${item.price}</p>
                      </div>
                      <FontAwesomeIcon icon={['fal', 'chevron-right']} className="text-gray-400" />
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Step 2: Select User */}
          {step === 2 && (
            <div>
              <h3 className="font-semibold mb-4">Step 2: Select Customer</h3>

              {/* Selected Item Summary */}
              {selectedItem && (
                <div className="bg-gray-50 p-3 rounded mb-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 flex-shrink-0">
                    {getItemImage(selectedItem) ? (
                      <CloudinaryImage
                        src={getItemImage(selectedItem)!}
                        alt={selectedItem.title}
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FontAwesomeIcon
                          icon={['fal', itemType === 'book' ? 'book' : 'box']}
                          className="text-gray-400 text-sm"
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{selectedItem.title}</p>
                    <p className="text-xs text-gray-500">${selectedItem.price}</p>
                  </div>
                  <button onClick={() => setStep(1)} className="text-primary text-sm">
                    Change
                  </button>
                </div>
              )}

              {/* User Search */}
              <div className="relative mb-4">
                <FontAwesomeIcon
                  icon={['fal', 'search']}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Users List */}
              <div className="max-h-64 overflow-y-auto border border-gray-200 rounded">
                {usersLoading ? (
                  <div className="p-4 text-center text-gray-500">Searching...</div>
                ) : userSearch.length < 2 ? (
                  <div className="p-4 text-center text-gray-500">
                    Type at least 2 characters to search
                  </div>
                ) : usersData?.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">No users found</div>
                ) : (
                  usersData?.map((user: User) => (
                    <button
                      key={user.id}
                      onClick={() => {
                        setSelectedUser(user);
                        setStep(3);
                      }}
                      className={`w-full flex items-center gap-3 p-3 border-b last:border-b-0 hover:bg-gray-50 text-left ${
                        selectedUser?.id === user.id ? 'bg-primary/10' : ''
                      }`}
                    >
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0 overflow-hidden">
                        {user.avatar ? (
                          <CloudinaryImage
                            src={user.avatar}
                            alt={user.name}
                            width={40}
                            height={40}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FontAwesomeIcon icon={['fal', 'user']} className="text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-gray-500 truncate">{user.email}</p>
                      </div>
                      <FontAwesomeIcon icon={['fal', 'chevron-right']} className="text-gray-400" />
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Step 3: Set Offer Details */}
          {step === 3 && (
            <div>
              <h3 className="font-semibold mb-4">Step 3: Offer Details</h3>

              {/* Summary */}
              <div className="bg-gray-50 p-3 rounded mb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-gray-200 flex-shrink-0">
                    {selectedItem && getItemImage(selectedItem) ? (
                      <CloudinaryImage
                        src={getItemImage(selectedItem)!}
                        alt={selectedItem.title}
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FontAwesomeIcon
                          icon={['fal', itemType === 'book' ? 'book' : 'box']}
                          className="text-gray-400 text-sm"
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{selectedItem?.title}</p>
                    <p className="text-xs text-gray-500">Original: ${selectedItem?.price}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <FontAwesomeIcon icon={['fal', 'user']} className="text-gray-400" />
                  <span>
                    {selectedUser?.name} ({selectedUser?.email})
                  </span>
                </div>
              </div>

              {/* Offer Price */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Offer Price *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={selectedItem?.price}
                    value={offerPrice}
                    onChange={(e) => setOfferPrice(e.target.value)}
                    placeholder="Enter offer price"
                    className="w-full pl-8 pr-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                {discount > 0 && (
                  <p className="text-sm text-green-600 mt-1">
                    {discount}% discount from original price
                  </p>
                )}
              </div>

              {/* Expiration */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Expires In</label>
                <select
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(parseInt(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value={3}>3 days</option>
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                </select>
              </div>

              {/* Message */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">
                  Personal Message (optional)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Add a personal note to your offer..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {createMutation.isError && (
                <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">
                  {createMutation.error?.message || 'Failed to create offer'}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-4 border-t">
          <button
            onClick={() => {
              if (step === 1) onClose();
              else setStep(step - 1);
            }}
            className="px-4 py-2 border border-gray-300 hover:bg-gray-50"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>

          {step === 3 ? (
            <button
              onClick={() => createMutation.mutate()}
              disabled={!offerPrice || createMutation.isPending}
              className="px-6 py-2 bg-primary text-white hover:bg-opacity-90 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating...' : 'Send Offer'}
            </button>
          ) : (
            <div />
          )}
        </div>
      </div>
    </div>
  );
}
