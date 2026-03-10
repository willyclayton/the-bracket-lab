'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/models',    label: 'Models' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/blog',      label: 'Blog' },
  { href: '/about',     label: 'About' },
];

export default function NavLinks() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-6 text-sm">
      {links.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(href + '/');
        return (
          <Link
            key={href}
            href={href}
            className={`nav-link ${active ? 'active text-lab-white' : 'text-lab-muted hover:text-lab-white'}`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
