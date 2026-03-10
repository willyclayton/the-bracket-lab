'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const links = [
  { href: '/',         label: 'Home',     exact: true },
  { href: '/brackets', label: 'Brackets', exact: false },
  { href: '/models',   label: 'Models',   exact: false },
  { href: '/blog',     label: 'Blog',     exact: false },
];

export default function NavLinks() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-6 text-sm">
      {links.map(({ href, label, exact }) => {
        const active = exact
          ? pathname === href
          : pathname === href || pathname.startsWith(href + '/');
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
