'use client';

import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';

interface FeaturedForm {
  isFeatured: boolean;
  featuredStartDate: string;
  featuredEndDate: string;
  featuredPriority: number;
}

interface FeaturedVendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  vendorName: string;
  featuredForm: FeaturedForm;
  onFormChange: (form: FeaturedForm) => void;
}

export default function FeaturedVendorModal({
  isOpen,
  onClose,
  onSave,
  vendorName,
  featuredForm,
  onFormChange,
}: FeaturedVendorModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-md w-full">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Featured Vendor Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FontAwesomeIcon icon={['fal', 'times']} className="text-xl" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-blue-50 p-3 border border-blue-200">
            <p className="text-sm font-medium text-gray-700">{vendorName}</p>
            <p className="text-xs text-gray-600 mt-1">
              Manage featured status for booksellers page
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isFeatured"
              checked={featuredForm.isFeatured}
              onChange={(e) => onFormChange({ ...featuredForm, isFeatured: e.target.checked })}
              className="text-base text-primary focus:ring-black border-gray-300"
            />
            <label htmlFor="isFeatured" className="text-sm font-medium text-gray-700">
              Feature this vendor
            </label>
          </div>

          {featuredForm.isFeatured && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date/Time (optional)
                </label>
                <input
                  type="datetime-local"
                  value={featuredForm.featuredStartDate}
                  onChange={(e) =>
                    onFormChange({ ...featuredForm, featuredStartDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty to start immediately</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date/Time (optional)
                </label>
                <input
                  type="datetime-local"
                  value={featuredForm.featuredEndDate}
                  onChange={(e) =>
                    onFormChange({ ...featuredForm, featuredEndDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty for no expiration (featured forever)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Priority
                </label>
                <input
                  type="number"
                  min="0"
                  value={featuredForm.featuredPriority}
                  onChange={(e) =>
                    onFormChange({
                      ...featuredForm,
                      featuredPriority: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="0"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Higher numbers appear first (0 = default)
                </p>
              </div>
            </>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="px-4 py-2 bg-primary text-white text-sm font-medium hover:bg-primary-dark"
          >
            <FontAwesomeIcon icon={['fal', 'star']} className="mr-2 text-base" />
            Update Featured Status
          </button>
        </div>
      </div>
    </div>
  );
}
