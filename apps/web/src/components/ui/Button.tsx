import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'success' | 'warning' | 'alert';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center font-semibold  transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-secondary text-primary hover:bg-secondary-dark focus:ring-secondary',
    secondary: 'bg-primary text-white hover:bg-primary-light focus:ring-black',
    outline:
      'border-2 border-secondary text-secondary hover:bg-secondary hover:text-primary focus:ring-secondary',
    ghost: 'text-secondary hover:bg-secondary/10 focus:ring-secondary',
    success: 'bg-success text-white hover:bg-success/90 focus:ring-success',
    warning: 'bg-warning text-primary hover:bg-warning/90 focus:ring-warning',
    alert: 'bg-alert text-white hover:bg-alert/90 focus:ring-alert',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  const classes = [baseStyles, variants[variant], sizes[size], fullWidth && 'w-full', className]
    .filter(Boolean)
    .join(' ');

  return (
    <button className={classes} disabled={disabled} {...props}>
      {children}
    </button>
  );
}
