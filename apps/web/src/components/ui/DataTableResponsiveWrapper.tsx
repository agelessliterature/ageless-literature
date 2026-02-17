import { ReactNode } from 'react';

interface DataTableResponsiveWrapperProps {
  children: ReactNode;
  showShadow?: boolean;
}

export default function DataTableResponsiveWrapper({
  children,
  showShadow = true,
}: DataTableResponsiveWrapperProps) {
  return (
    <div className="relative overflow-x-auto">
      {showShadow && (
        <>
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent pointer-events-none z-10 lg:hidden" />
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none z-10 lg:hidden" />
        </>
      )}
      <div className="min-w-full inline-block align-middle">{children}</div>
    </div>
  );
}
