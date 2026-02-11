'use client';

import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';

interface CreateVendorForm {
  userId: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  shopName: string;
  shopUrl: string;
  commissionRate: number;
  status: string;
  adminNotes: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  provider?: 'credentials' | 'google' | 'apple';
  firstName?: string;
  lastName?: string;
}

interface CreateVendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: () => void;
  createMode: 'existing' | 'new';
  onModeChange: (mode: 'existing' | 'new') => void;
  form: CreateVendorForm;
  onFormChange: (form: CreateVendorForm) => void;
  error: string;
  userSearch: string;
  onUserSearchChange: (search: string) => void;
  searchResults: User[];
  selectedUser: User | null;
  onSelectUser: (user: User) => void;
}

export default function CreateVendorModal({
  isOpen,
  onClose,
  onCreate,
  createMode,
  onModeChange,
  form,
  onFormChange,
  error,
  userSearch,
  onUserSearchChange,
  searchResults,
  selectedUser,
  onSelectUser,
}: CreateVendorModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Create Vendor</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <FontAwesomeIcon icon={['fal', 'times']} className="text-xl" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex gap-2">
            <button
              onClick={() => onModeChange('existing')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                createMode === 'existing'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FontAwesomeIcon icon={['fal', 'user-plus']} className="mr-2 text-base" />
              Use Existing User
            </button>
            <button
              onClick={() => onModeChange('new')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                createMode === 'new'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FontAwesomeIcon icon={['fal', 'plus']} className="mr-2 text-base" />
              Create New User + Vendor
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 text-sm rounded">
              {error}
            </div>
          )}

          {createMode === 'existing' ? (
            <>
              {/* Existing User Mode */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select User <span className="text-red-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => onUserSearchChange(e.target.value)}
                    placeholder="Search by email or name..."
                    className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  />
                  {searchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 shadow-lg max-h-60 overflow-y-auto">
                      {searchResults.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => onSelectUser(user)}
                          className="w-full px-4 py-2 text-left hover:bg-gray-100 text-sm"
                        >
                          <div className="font-medium text-gray-900">{user.name}</div>
                          <div className="text-gray-600">{user.email}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="text-xs text-gray-500">{user.role}</div>
                            {user.provider === 'google' && (
                              <span className="inline-flex items-center text-xs text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                                <FontAwesomeIcon
                                  icon={['fab', 'google']}
                                  className="text-xs mr-1"
                                />
                                Google
                              </span>
                            )}
                            {user.provider === 'apple' && (
                              <span className="inline-flex items-center text-xs text-gray-900 bg-gray-100 px-1.5 py-0.5 rounded">
                                <FontAwesomeIcon icon={['fab', 'apple']} className="text-xs mr-1" />
                                Apple
                              </span>
                            )}
                            {user.provider === 'credentials' && (
                              <span className="inline-flex items-center text-xs text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                                <FontAwesomeIcon icon={['fal', 'key']} className="text-xs mr-1" />
                                Email/Password
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedUser && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 text-sm">
                    <div className="font-medium text-gray-900">Selected: {selectedUser.name}</div>
                    <div className="text-gray-600">{selectedUser.email}</div>
                    <div className="flex items-center gap-2 mt-1">
                      {selectedUser.provider === 'google' && (
                        <span className="inline-flex items-center text-xs text-gray-600 bg-white border border-gray-300 px-2 py-0.5 rounded">
                          <FontAwesomeIcon icon={['fab', 'google']} className="text-sm mr-1" />
                          Google
                        </span>
                      )}
                      {selectedUser.provider === 'apple' && (
                        <span className="inline-flex items-center text-xs text-gray-900 bg-white border border-gray-300 px-2 py-0.5 rounded">
                          <FontAwesomeIcon icon={['fab', 'apple']} className="text-sm mr-1" />
                          Apple
                        </span>
                      )}
                      {selectedUser.provider === 'credentials' && (
                        <span className="inline-flex items-center text-xs text-gray-600 bg-white border border-gray-300 px-2 py-0.5 rounded">
                          <FontAwesomeIcon icon={['fal', 'key']} className="text-sm mr-1" />
                          Email/Password
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {/* New User Mode */}
              <div className="bg-blue-50 p-3 border border-blue-200 text-sm text-blue-900 mb-4">
                Creating a new user account and vendor profile simultaneously
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-600">*</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => onFormChange({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="vendor@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password <span className="text-red-600">*</span>
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => onFormChange({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="Minimum 8 characters"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={form.firstName}
                    onChange={(e) => onFormChange({ ...form, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                  <input
                    type="text"
                    value={form.lastName}
                    onChange={(e) => onFormChange({ ...form, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                  />
                </div>
              </div>
            </>
          )}

          {/* Vendor Information (Both Modes) */}
          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Vendor Information</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Shop Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={form.shopName}
                onChange={(e) => onFormChange({ ...form, shopName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="My Rare Books Shop"
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Shop URL (Slug) <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={form.shopUrl}
                onChange={(e) => onFormChange({ ...form, shopUrl: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="my-rare-books-shop"
              />
              <p className="mt-1 text-xs text-gray-500">
                URL-friendly slug (lowercase, hyphens only)
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Commission Rate (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="50"
                  value={form.commissionRate}
                  onChange={(e) =>
                    onFormChange({ ...form, commissionRate: parseFloat(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
                <p className="mt-1 text-xs text-gray-500">Default: 8%</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => onFormChange({ ...form, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="active">Active</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Admin Notes</label>
              <textarea
                value={form.adminNotes}
                onChange={(e) => onFormChange({ ...form, adminNotes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="Internal notes (not visible to vendor)"
              />
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onCreate}
            className="px-4 py-2 bg-primary text-white text-sm font-medium hover:bg-primary-dark"
          >
            <FontAwesomeIcon icon={['fal', 'plus']} className="mr-2 text-base" />
            {createMode === 'existing' ? 'Create Vendor' : 'Create User & Vendor'}
          </button>
        </div>
      </div>
    </div>
  );
}
