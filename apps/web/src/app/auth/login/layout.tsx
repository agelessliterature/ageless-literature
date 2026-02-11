import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login - Ageless Literature',
  description: 'Sign in to your Ageless Literature account',
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
