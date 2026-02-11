'use client';

/**
 * PhoneInput Component
 * International phone number input with country selector and auto-formatting
 * Supports 60+ countries with proper formatting for each
 */

import { useState, useEffect, useRef } from 'react';
import {
  phoneCountries,
  type PhoneCountry,
  formatPhoneByCountry,
  parsePhoneNumber,
  getCountryByDialCode,
} from '@/lib/phoneCountries';

interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  defaultCountry?: string; // Country code like 'US', 'GB'
}

export default function PhoneInput({
  value,
  onChange,
  placeholder,
  className = '',
  required = false,
  disabled = false,
  error,
  defaultCountry = 'US',
}: PhoneInputProps) {
  const [selectedCountry, setSelectedCountry] = useState<PhoneCountry>(() => {
    // Try to parse existing value to get country
    if (value) {
      const parsed = parsePhoneNumber(value);
      if (parsed) {
        const country = getCountryByDialCode(parsed.dialCode);
        if (country) return country;
      }
    }
    return phoneCountries.find((c) => c.code === defaultCountry) || phoneCountries[0];
  });

  const [phoneNumber, setPhoneNumber] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Parse value on mount and when it changes externally
  useEffect(() => {
    if (value) {
      const parsed = parsePhoneNumber(value);
      if (parsed) {
        const country = getCountryByDialCode(parsed.dialCode);
        if (country) {
          setSelectedCountry(country);
          setPhoneNumber(parsed.number);
        }
      }
    } else {
      setPhoneNumber('');
    }
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isDropdownOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isDropdownOpen]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    // Remove all non-digit characters
    const digits = input.replace(/\D/g, '');

    // Limit to country's max length
    const limited = digits.substring(0, selectedCountry.maxLength);
    setPhoneNumber(limited);

    // Combine dial code + number and send to parent
    const fullNumber = selectedCountry.dialCode + limited;
    onChange(fullNumber);
  };

  const handleCountrySelect = (country: PhoneCountry) => {
    setSelectedCountry(country);
    setIsDropdownOpen(false);
    setSearchQuery('');

    // Update the full phone number with new country code
    const fullNumber = country.dialCode + phoneNumber.substring(0, country.maxLength);
    onChange(fullNumber);
  };

  const filteredCountries = phoneCountries.filter(
    (country) =>
      country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      country.dialCode.includes(searchQuery) ||
      country.code.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const formattedDisplay = phoneNumber ? formatPhoneByCountry(phoneNumber, selectedCountry) : '';
  const placeholderText = placeholder || selectedCountry.placeholder;

  return (
    <div className="relative">
      <div className="flex">
        {/* Country Selector */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            disabled={disabled}
            className="flex items-center gap-2 px-3 py-1.5 border border-r-0 border-gray-300 bg-gray-50 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <span className="text-xl">{selectedCountry.flag}</span>
            <span className="text-sm font-medium text-gray-700">{selectedCountry.dialCode}</span>
            <svg
              className="text-base text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {/* Dropdown */}
          {isDropdownOpen && (
            <div className="absolute z-50 mt-1 w-80 bg-white border border-gray-300 shadow-lg max-h-96 overflow-hidden flex flex-col">
              {/* Search */}
              <div className="p-2 border-b border-gray-200">
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search countries..."
                  className="w-full px-3 py-2 border border-gray-300 text-sm focus:ring-2 focus:ring-black focus:border-transparent"
                />
              </div>

              {/* Countries List */}
              <div className="overflow-y-auto">
                {filteredCountries.length > 0 ? (
                  filteredCountries.map((country) => (
                    <button
                      key={country.code}
                      type="button"
                      onClick={() => handleCountrySelect(country)}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-100 transition ${
                        selectedCountry.code === country.code ? 'bg-primary/10' : ''
                      }`}
                    >
                      <span className="text-xl">{country.flag}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {country.name}
                        </div>
                        <div className="text-xs text-gray-500">{country.dialCode}</div>
                      </div>
                      {selectedCountry.code === country.code && (
                        <svg
                          className="text-xl text-primary"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center text-sm text-gray-500">
                    No countries found
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Phone Number Input */}
        <input
          type="tel"
          value={formattedDisplay}
          onChange={handlePhoneChange}
          placeholder={placeholderText}
          className={`flex-1 rounded-r-lg border-l-0 ${className}`}
          required={required}
          disabled={disabled}
          autoComplete="tel"
        />
      </div>

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}

      {/* Helper text */}
      {!error && (
        <p className="mt-1 text-xs text-gray-500">
          Format: {selectedCountry.dialCode} {selectedCountry.placeholder}
        </p>
      )}
    </div>
  );
}
