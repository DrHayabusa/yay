'use client';

import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEffect } from 'react';
import { Logo } from './Logo';
import { clearTokens, isLoggedIn } from '@/lib/api';

const NAV = [
  { href: '/cases', label: 'Live cases', glyph: '⛟' },
  { href: '/verification', label: 'Verification', glyph: '✓' },
  { href: '/pricing', label: 'Pricing', glyph: 'د' },
];

/** Authenticated chrome: sidebar + hazard strip across the top. */
export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn()) router.replace('/');
  }, [router]);

  return (
    <>
      <div className="hazard" />
      <div className="shell">
        <aside className="side">
          <div className="side__brand">
            <Logo />
            <div className="wordmark">
              SANAD
              <small>operations · عمليات</small>
            </div>
          </div>
          <nav>
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={`navlink${pathname.startsWith(n.href) ? ' navlink--active' : ''}`}
              >
                <span aria-hidden style={{ width: 16, textAlign: 'center' }}>{n.glyph}</span>
                <span>{n.label}</span>
              </Link>
            ))}
          </nav>
          <div className="side__foot">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                clearTokens();
                router.replace('/');
              }}
            >
              Sign out →
            </a>
          </div>
        </aside>
        <main className="content">{children}</main>
      </div>
    </>
  );
}
