'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import { getApiUrl } from '@/lib/api';

interface BookSearchResult {
  id: number;
  title: string;
  author: string;
  vendorName: string;
  slug: string | null;
  images: string[];
  productLink: string;
}

interface EditableHighSpot {
  bookId: number | '';
  description: string;
  imageUrl: string | null;
}

interface AdminHighSpotResponseItem {
  bookId: number;
  description: string;
  title?: string;
  image?: string | null;
  productLink?: string | null;
}

const emptyItem = (): EditableHighSpot => ({
  bookId: '',
  description: '',
  imageUrl: null,
});

export default function AdminHighSpotsPage() {
  const { data: session, status } = useSession();

  // Showcase item state — each index corresponds to one showcase slot
  const [items, setItems] = useState<EditableHighSpot[]>([emptyItem()]);
  const [searchQueries, setSearchQueries] = useState<string[]>(['']);
  const [searchResults, setSearchResults] = useState<BookSearchResult[][]>([[]]);
  const [searchLoading, setSearchLoading] = useState<boolean[]>([false]);
  const [activeSearchIndex, setActiveSearchIndex] = useState<number | null>(null);
  const [selectedBooksById, setSelectedBooksById] = useState<Record<number, BookSearchResult>>({});

  // Page-level UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [pageTitle, setPageTitle] = useState('High Spots');
  const [imageLoadingIndex, setImageLoadingIndex] = useState<number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Debounce timers keyed by item index
  const searchTimeouts = useRef<Record<number, ReturnType<typeof setTimeout>>>({});

  // Load existing high spots config and book images from the API on mount
  useEffect(() => {
    const loadData = async () => {
      if (!session?.accessToken) {
        if (status === 'unauthenticated') {
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        setError('');

        const highSpotsRes = await fetch(`${getApiUrl('api/admin/high-spots')}`, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
          },
        });

        if (!highSpotsRes.ok) {
          throw new Error('Failed to load high spots configuration.');
        }

        const highSpotsJson = await highSpotsRes.json();
        const loadedTitle =
          typeof highSpotsJson?.data?.title === 'string' && highSpotsJson.data.title.trim()
            ? highSpotsJson.data.title.trim()
            : 'High Spots';
        const loadedResponseItems: AdminHighSpotResponseItem[] = Array.isArray(
          highSpotsJson?.data?.items,
        )
          ? (highSpotsJson.data.items as AdminHighSpotResponseItem[])
          : [];

        const loadedItems = loadedResponseItems.map((item) => ({
          bookId: item.bookId,
          description: item.description || '',
          imageUrl: item.image || null,
        }));

        // Fetch all media images for each loaded book in parallel
        const loadedBookIds = loadedResponseItems
          .map((item) => item.bookId)
          .filter(Boolean) as number[];

        const bookImagesResults = await Promise.all(
          loadedBookIds.map(async (bookId) => {
            try {
              const res = await fetch(`${getApiUrl(`api/admin/books/${bookId}`)}`, {
                headers: { Authorization: `Bearer ${session.accessToken}` },
              });
              if (!res.ok) return { bookId, images: [] as string[] };
              const json = await res.json();
              const raw = json?.data;
              const images = (Array.isArray(raw?.media) ? raw.media : [])
                .map((m: any) => (m.imageUrl || m.thumbnailUrl) as string)
                .filter(Boolean) as string[];
              return { bookId, images };
            } catch {
              return { bookId, images: [] as string[] };
            }
          }),
        );

        const imagesByBookId: Record<number, string[]> = {};
        for (const { bookId, images } of bookImagesResults) {
          imagesByBookId[bookId] = images;
        }

        if (highSpotsJson?.data?.updatedAt) {
          setLastUpdated(new Date(highSpotsJson.data.updatedAt));
        }
        setItems(loadedItems.length ? loadedItems : [emptyItem()]);
        setPageTitle(loadedTitle);
        setSearchQueries(
          loadedItems.length ? loadedResponseItems.map((item) => item.title || '') : [''],
        );
        setSearchResults(loadedItems.length ? loadedItems.map(() => []) : [[]]);
        setSearchLoading(loadedItems.length ? loadedItems.map(() => false) : [false]);

        const selectedMap: Record<number, BookSearchResult> = {};
        for (const item of loadedResponseItems) {
          if (!item.bookId) {
            continue;
          }

          selectedMap[item.bookId] = {
            id: item.bookId,
            title: item.title || `Book #${item.bookId}`,
            author: '',
            vendorName: '',
            slug: null,
            images: imagesByBookId[item.bookId] || (item.image ? [item.image] : []),
            productLink: item.productLink || `/products/${item.bookId}`,
          };
        }

        setSelectedBooksById(selectedMap);
      } catch (loadError: any) {
        setError(loadError?.message || 'Failed to load high spots data.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [session?.accessToken, status]);

  // Query the admin books endpoint and populate search results for a given slot
  const runBookSearch = async (index: number, query: string) => {
    if (!session?.accessToken) {
      return;
    }

    if (query.trim().length < 2) {
      setSearchResults((prev) => {
        const next = [...prev];
        next[index] = [];
        return next;
      });
      return;
    }

    setSearchLoading((prev) => {
      const next = [...prev];
      next[index] = true;
      return next;
    });

    try {
      const url = `${getApiUrl('api/admin/books')}?search=${encodeURIComponent(query)}&limit=15&status=published&sortBy=created_at&sortOrder=DESC`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to search books.');
      }

      const json = await response.json();
      const rawBooks = Array.isArray(json?.data) ? json.data : [];

      const mapped: BookSearchResult[] = rawBooks.map((book: any) => {
        const slug = typeof book?.slug === 'string' ? book.slug : null;
        const productLink = slug ? `/products/${slug}` : `/products/${book.id}`;
        const firstMedia = Array.isArray(book?.media) && book.media.length ? book.media[0] : null;
        const firstImage = firstMedia?.imageUrl || firstMedia?.thumbnailUrl || null;

        return {
          id: Number(book.id),
          title: book.title || '',
          author: book.author || '',
          vendorName: book?.vendor?.shopName || 'Unknown vendor',
          slug,
          images: firstImage ? [firstImage] : [],
          productLink,
        };
      });

      setSearchResults((prev) => {
        const next = [...prev];
        next[index] = mapped;
        return next;
      });
    } catch (_searchError) {
      setSearchResults((prev) => {
        const next = [...prev];
        next[index] = [];
        return next;
      });
    } finally {
      setSearchLoading((prev) => {
        const next = [...prev];
        next[index] = false;
        return next;
      });
    }
  };

  // Debounce book search input to avoid firing on every keystroke
  const onSearchInputChange = (index: number, value: string) => {
    setSearchQueries((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });

    if (searchTimeouts.current[index]) {
      clearTimeout(searchTimeouts.current[index]);
    }

    searchTimeouts.current[index] = setTimeout(() => {
      runBookSearch(index, value);
    }, 250);
  };

  // Commit a search result as the selected book for a slot, then fetch its full image list
  const setBookBySearchResult = async (index: number, book: BookSearchResult) => {
    setItems((prev) =>
      prev.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        return {
          ...item,
          bookId: book.id,
          imageUrl: null,
        };
      }),
    );

    setSelectedBooksById((prev) => ({
      ...prev,
      [book.id]: book,
    }));

    setSearchQueries((prev) => {
      const next = [...prev];
      next[index] = book.title;
      return next;
    });

    setSearchResults((prev) => {
      const next = [...prev];
      next[index] = [];
      return next;
    });

    setActiveSearchIndex(null);

    // Fetch all images for this book
    if (!session?.accessToken) return;
    setImageLoadingIndex(index);
    try {
      const res = await fetch(`${getApiUrl(`api/admin/books/${book.id}`)}`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      if (res.ok) {
        const json = await res.json();
        const raw = json?.data;
        const allImages = (Array.isArray(raw?.media) ? raw.media : [])
          .map((m: any) => (m.imageUrl || m.thumbnailUrl) as string)
          .filter(Boolean) as string[];

        setSelectedBooksById((prev) => ({
          ...prev,
          [book.id]: { ...prev[book.id], images: allImages },
        }));

        if (allImages.length > 0) {
          setItems((prev) =>
            prev.map((item, itemIndex) => {
              if (itemIndex !== index) return item;
              return { ...item, imageUrl: allImages[0] };
            }),
          );
        }
      }
    } catch {
      // ignore image load errors
    } finally {
      setImageLoadingIndex(null);
    }
  };

  const setDescription = (index: number, value: string) => {
    setItems((prev) =>
      prev.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        return {
          ...item,
          description: value,
        };
      }),
    );
  };

  const setItemImage = (index: number, imgUrl: string) => {
    setItems((prev) =>
      prev.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        return { ...item, imageUrl: imgUrl };
      }),
    );
  };

  // Slot management — add, remove, and reorder showcase items
  const addItem = () => {
    setItems((prev) => [...prev, emptyItem()]);
    setSearchQueries((prev) => [...prev, '']);
    setSearchResults((prev) => [...prev, []]);
    setSearchLoading((prev) => [...prev, false]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => {
      const next = prev.filter((_, itemIndex) => itemIndex !== index);
      return next.length ? next : [emptyItem()];
    });

    setSearchQueries((prev) => {
      const next = prev.filter((_, itemIndex) => itemIndex !== index);
      return next.length ? next : [''];
    });

    setSearchResults((prev) => {
      const next = prev.filter((_, itemIndex) => itemIndex !== index);
      return next.length ? next : [[]];
    });

    setSearchLoading((prev) => {
      const next = prev.filter((_, itemIndex) => itemIndex !== index);
      return next.length ? next : [false];
    });
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= items.length) {
      return;
    }

    setItems((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

    setSearchQueries((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

    setSearchResults((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

    setSearchLoading((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  // Persist the current showcase configuration to the API
  const handleSave = async () => {
    if (!session?.accessToken) {
      setError('You must be logged in as admin to update high spots.');
      return;
    }

    const payloadItems = items
      .filter((item) => Number.isInteger(item.bookId) && Number(item.bookId) > 0)
      .map((item) => ({
        bookId: Number(item.bookId),
        description: item.description.trim(),
        imageUrl: item.imageUrl || undefined,
      }));

    if (!payloadItems.length) {
      setError('Add at least one showcased book before saving.');
      setSuccess('');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const response = await fetch(`${getApiUrl('api/admin/high-spots')}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({
          title: pageTitle.trim() || 'High Spots',
          items: payloadItems,
        }),
      });

      const json = await response.json();
      if (!response.ok || !json?.success) {
        throw new Error(json?.message || 'Failed to save high spots.');
      }

      setLastUpdated(new Date());
      setSuccess('High Spots updated successfully.');
      setPageTitle(
        typeof json?.data?.title === 'string' && json.data.title.trim()
          ? json.data.title.trim()
          : 'High Spots',
      );
      setItems(
        Array.isArray(json?.data?.items) && json.data.items.length
          ? json.data.items.map((item: AdminHighSpotResponseItem) => ({
              imageUrl: item.image || null,
              bookId: item.bookId,
              description: item.description || '',
            }))
          : [emptyItem()],
      );
    } catch (saveError: any) {
      setError(saveError?.message || 'Failed to save high spots.');
      setSuccess('');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-gray-600">Loading High Spots editor...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">High Spots Editor</h1>
          <p className="text-sm text-gray-500 mt-1">
            Choose which books are showcased on the public High Spots page and update each
            description.
          </p>
          {lastUpdated && (
            <p className="text-xs text-gray-400 mt-1">
              Last updated:{' '}
              {lastUpdated.toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}{' '}
              at {lastUpdated.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>

        <Link
          href="/high-spots"
          target="_blank"
          className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
        >
          <FontAwesomeIcon icon={['fal', 'external-link']} className="text-sm" />
          View Public Page
        </Link>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-sm border border-red-200">{error}</div>
      )}
      {success && (
        <div className="p-3 bg-emerald-50 text-emerald-700 text-sm border border-emerald-200">
          {success}
        </div>
      )}

      <div className="bg-white border border-gray-200 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Page Title</label>
        <input
          type="text"
          value={pageTitle}
          onChange={(event) => setPageTitle(event.target.value)}
          placeholder="April High Spots"
          className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
        />
        <p className="mt-1 text-xs text-gray-500">
          This title appears on the public High Spots page.
        </p>
      </div>

      <div className="space-y-6">
        {items.map((item, index) => {
          const selectedBook =
            typeof item.bookId === 'number' ? selectedBooksById[item.bookId] : null;
          const productLink = selectedBook?.productLink || '';

          return (
            <div
              key={index}
              className="bg-white border border-gray-300 border-l-4 border-l-gray-800 shadow-sm p-4 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-gray-900">Showcase #{index + 1}</h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => moveItem(index, 'up')}
                    disabled={index === 0}
                    className="px-2 py-1 text-xs border border-gray-300 text-gray-700 disabled:opacity-40"
                  >
                    Up
                  </button>
                  <button
                    type="button"
                    onClick={() => moveItem(index, 'down')}
                    disabled={index === items.length - 1}
                    className="px-2 py-1 text-xs border border-gray-300 text-gray-700 disabled:opacity-40"
                  >
                    Down
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="px-2 py-1 text-xs border border-red-300 text-red-700 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Book</label>
                <input
                  type="text"
                  value={searchQueries[index] || ''}
                  onChange={(event) => onSearchInputChange(index, event.target.value)}
                  onFocus={() => setActiveSearchIndex(index)}
                  placeholder="Search by title or author..."
                  className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />

                {searchLoading[index] && (
                  <p className="mt-1 text-xs text-gray-500">Searching books...</p>
                )}

                {activeSearchIndex === index && (searchResults[index]?.length || 0) > 0 && (
                  <div className="absolute z-20 mt-1 w-full max-h-64 overflow-y-auto border border-gray-200 bg-white shadow-lg">
                    {searchResults[index].map((book) => (
                      <button
                        key={book.id}
                        type="button"
                        onClick={() => setBookBySearchResult(index, book)}
                        className="w-full text-left px-3 py-2 border-b border-gray-100 hover:bg-gray-50"
                      >
                        <div className="text-sm text-gray-900">{book.title}</div>
                        <div className="text-xs text-gray-600">
                          {book.author || 'Unknown author'} - Vendor: {book.vendorName}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  rows={5}
                  value={item.description}
                  onChange={(event) => setDescription(index, event.target.value)}
                  className="w-full border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="Write the showcase description for this book..."
                />
              </div>

              {selectedBook && (
                <div className="bg-gray-50 border border-gray-300 p-3 space-y-3">
                  <p className="text-xs text-gray-600">
                    <span className="font-medium text-gray-700">Shop Link:</span> {productLink}
                  </p>
                  {imageLoadingIndex === index ? (
                    <p className="text-xs text-gray-500">Loading images...</p>
                  ) : selectedBook.images.length > 0 ? (
                    <div>
                      <p className="text-xs font-medium text-gray-700 mb-2">Select image:</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedBook.images.map((imgUrl, imgIdx) => (
                          <button
                            key={imgIdx}
                            type="button"
                            onClick={() => setItemImage(index, imgUrl)}
                            className={`w-16 h-16 border-2 overflow-hidden flex-shrink-0 ${item.imageUrl === imgUrl ? 'border-black ring-2 ring-black ring-offset-1' : 'border-gray-200 hover:border-gray-400'}`}
                          >
                            <img
                              src={imgUrl}
                              alt={`Image ${imgIdx + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">No images available for this book.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={addItem}
          className="px-4 py-2 border border-gray-300 text-sm text-gray-700 hover:bg-gray-50"
        >
          Add Showcase
        </button>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 bg-primary text-white text-sm font-medium hover:bg-black disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save High Spots'}
        </button>
      </div>
    </div>
  );
}
