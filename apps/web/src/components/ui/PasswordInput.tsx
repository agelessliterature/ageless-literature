'use client';

import React, { useState, forwardRef } from 'react';
import { FontAwesomeIcon } from '@/components/FontAwesomeIcon';
import PasswordStrengthIndicator from './PasswordStrengthIndicator';

interface PasswordInputProps {
  label?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  showStrengthIndicator?: boolean;
  showRequirements?: boolean;
  className?: string;
  disabled?: boolean;
  autoComplete?: string;
  id?: string;
  name?: string;
  required?: boolean;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
}

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    {
      label,
      placeholder = 'Enter password',
      value,
      onChange,
      onBlur,
      error,
      showStrengthIndicator = true,
      showRequirements = true,
      className = '',
      disabled = false,
      autoComplete = 'current-password',
      id,
      name,
      required = false,
      'aria-describedby': ariaDescribedBy,
      'aria-invalid': ariaInvalid,
    },
    ref,
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const [focused, setFocused] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    };

    const togglePasswordVisibility = () => {
      setShowPassword(!showPassword);
    };

    return (
      <div className={`space-y-3 ${className}`}>
        {/* Label */}
        {label && (
          <label htmlFor={id} className="block text-sm font-medium text-gray-700">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        {/* Input Container */}
        <div className="relative">
          <input
            ref={ref}
            id={id}
            name={name}
            type={showPassword ? 'text' : 'password'}
            value={value}
            onChange={handleChange}
            onBlur={() => {
              setFocused(false);
              onBlur?.();
            }}
            onFocus={() => setFocused(true)}
            placeholder={placeholder}
            autoComplete={autoComplete}
            disabled={disabled}
            required={required}
            aria-invalid={ariaInvalid}
            aria-describedby={ariaDescribedBy}
            className={`
              appearance-none relative block w-full px-3 py-2 pr-10 
              border  text-gray-900 placeholder-gray-500
              focus:outline-none focus:ring-2 focus:ring-black focus:border-black
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-200
              ${error ? 'border-red-300 focus:ring-black focus:border-black' : 'border-gray-300'}
            `}
          />

          {/* Show/Hide Password Button */}
          <button
            type="button"
            onClick={togglePasswordVisibility}
            disabled={disabled}
            className={`
              absolute inset-y-0 right-0 pr-3 flex items-center
              text-gray-400 hover:text-gray-600 focus:outline-none
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-200
            `}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? (
              <FontAwesomeIcon icon={['fal', 'eye-slash']} className="text-xl" aria-hidden="true" />
            ) : (
              <FontAwesomeIcon icon={['fal', 'eye']} className="text-xl" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        {/* Password Strength Indicator */}
        {showStrengthIndicator && (focused || value) && (
          <PasswordStrengthIndicator
            password={value}
            showRequirements={showRequirements}
            className="mt-3"
          />
        )}
      </div>
    );
  },
);

PasswordInput.displayName = 'PasswordInput';

export default PasswordInput;
