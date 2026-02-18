import AccountLayoutClient from './AccountLayoutClient';

export const dynamic = 'force-dynamic';

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <AccountLayoutClient>{children}</AccountLayoutClient>;
}
