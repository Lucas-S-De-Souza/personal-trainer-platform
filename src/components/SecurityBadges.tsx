const badges = [
  { label: "Pagamento processado pela Stripe" },
  { label: "Dados de cartão nunca passam pelo nosso servidor" },
  { label: "Conexão criptografada (HTTPS)" },
];

export function SecurityBadges() {
  return (
    <ul className="flex flex-col gap-2.5 border-t border-gray-border pt-5">
      {badges.map((badge) => (
        <li key={badge.label} className="flex items-center gap-2.5 text-xs text-gray-text">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-4 w-4 flex-shrink-0 text-pink-deep"
            aria-hidden="true"
          >
            <rect x="4" y="10" width="16" height="10" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          </svg>
          {badge.label}
        </li>
      ))}
    </ul>
  );
}
