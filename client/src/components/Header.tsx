'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export default function Header() {
  const { isAuthenticated, logout } = useAuth();

  return (
    <header className="bg-white shadow-md">
      <nav className="container mx-auto flex items-center justify-between p-4">
        <Link href="/" className="text-xl font-bold text-indigo-600">
          ComponentGen
        </Link>
        <div className="space-x-4">
          {isAuthenticated ? (
            <button
              onClick={logout}
              className="rounded-md bg-red-500 px-4 py-2 text-white hover:bg-red-600"
            >
              Logout
            </button>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-md px-4 py-2 text-gray-700 hover:bg-gray-100"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}