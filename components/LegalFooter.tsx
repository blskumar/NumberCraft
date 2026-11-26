const LINKS = [
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
  { href: '/grievance', label: 'Grievance & contact' },
];

export default function LegalFooter() {
  return (
    <div className="px-4 py-6 text-center text-xs text-[#5A6572]">
      <nav aria-label="Legal" className="flex flex-wrap justify-center gap-x-4 gap-y-1">
        {LINKS.map((l) => (
          <a
            key={l.href}
            href={l.href}
            className="font-semibold text-[#1D4ED8] underline underline-offset-2"
          >
            {l.label}
          </a>
        ))}
      </nav>
    </div>
  );
}
