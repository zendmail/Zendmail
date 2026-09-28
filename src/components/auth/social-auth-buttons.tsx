import type { SVGProps } from "react";

type ProviderIconProps = SVGProps<SVGSVGElement>;

function GoogleIcon(props: ProviderIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" {...props}>
      <path fill="#4285F4" d="M21.6 12.23c0-.72-.06-1.42-.18-2.09H12v3.96h5.38a4.6 4.6 0 0 1-1.99 3.02v2.52h3.22c1.89-1.74 2.99-4.3 2.99-7.41Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.61-2.44l-3.22-2.52c-.9.6-2.05.96-3.39.96-2.61 0-4.83-1.76-5.62-4.13H3.05v2.6A9.99 9.99 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.38 13.87A6.02 6.02 0 0 1 6.06 12c0-.65.11-1.28.32-1.87v-2.6H3.05A10 10 0 0 0 2 12c0 1.61.39 3.13 1.05 4.47l3.33-2.6Z" />
      <path fill="#EA4335" d="M12 6c1.47 0 2.79.5 3.83 1.49l2.87-2.87C16.95 2.99 14.7 2 12 2a9.99 9.99 0 0 0-8.95 5.53l3.33 2.6C7.17 7.76 9.39 6 12 6Z" />
    </svg>
  );
}

function AppleIcon(props: ProviderIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M16.77 12.76c.02 2.04 1.79 2.72 1.81 2.73-.02.05-.28.96-.93 1.9-.56.81-1.14 1.62-2.06 1.64-.9.02-1.19-.53-2.22-.53-1.03 0-1.35.51-2.2.55-.89.03-1.56-.88-2.12-1.69-1.15-1.66-2.03-4.68-.85-6.72.59-1.01 1.65-1.65 2.8-1.67.87-.02 1.7.58 2.22.58.52 0 1.5-.72 2.53-.62.43.02 1.64.18 2.41 1.34-.06.04-1.44.84-1.42 2.49ZM15.11 7.88c.47-.57.78-1.36.7-2.15-.68.03-1.5.45-1.98 1.02-.43.5-.8 1.31-.7 2.08.76.06 1.51-.39 1.98-.95Z" />
    </svg>
  );
}

function FacebookIcon(props: ProviderIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M13.5 21v-8h2.7l.4-3h-3.1V8.08c0-.87.24-1.46 1.5-1.46h1.7V3.94c-.3-.04-1.34-.14-2.55-.14-2.52 0-4.25 1.54-4.25 4.37V10H7v3h2.9v8h3.6Z" />
    </svg>
  );
}

const providers = [
  { label: "Google", icon: GoogleIcon },
  { label: "Apple", icon: AppleIcon },
  { label: "Facebook", icon: FacebookIcon },
];

export function SocialAuthButtons() {
  return (
    <div className="mt-5" aria-label="Social sign-in providers">
      <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-text-tertiary">
        <span className="h-px flex-1 bg-border" />
        <span>or continue with</span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <div className="mt-4 flex justify-center gap-4">
        {providers.map(({ label, icon: Icon }) => (
          <button
            key={label}
            type="button"
            disabled
            aria-label={`${label} sign in is not configured`}
            title={`${label} sign in is not configured`}
            className="social-auth-button flex h-12 w-12 items-center justify-center rounded-full border border-[#E5EAF2] bg-white text-[#0B1633] shadow-[0_4px_12px_rgb(11_22_51/0.06)] disabled:cursor-not-allowed disabled:opacity-80"
          >
            <Icon width={19} height={19} />
          </button>
        ))}
      </div>
    </div>
  );
}
