import Image from 'next/image';

export type BrandLogoTone = 'dark' | 'light';

interface BrandLogoProps {
  priority?: boolean;
  compact?: boolean;
  className?: string;
  tone?: 'dark' | 'light';
}

export function BrandLogo({ priority = false, compact = false, className = '', tone = 'dark' }: BrandLogoProps) {
  const primaryTextClass = tone === 'light' ? 'text-[#17110e]' : 'text-white';
  const secondaryTextClass = tone === 'light' ? 'text-[#6f625a]' : 'text-white/72';
  tone?: BrandLogoTone;
}

/**
 * Canonical CTG One Technology institutional lockup.
 *
 * Brand invariant:
 * - the gold CTG nucleus is immutable across every product and sub-brand;
 * - the CTG One / Technology hierarchy and spacing stay consistent;
 * - only typography contrast may adapt to the surface behind the lockup.
 */
export function BrandLogo({
  priority = false,
  compact = false,
  className = '',
  tone = 'dark',
}: BrandLogoProps) {
  const primaryText = tone === 'light' ? 'text-[#17110e]' : 'text-white';
  const descriptorText = tone === 'light' ? 'text-[#5f5148]' : 'text-white/72';

  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center gap-2.5 ${className}`}
      data-brand-lockup="ctg-one-technology"
      data-brand-tone={tone}
      data-no-translate
      translate="no"
    >
      <span className="relative flex h-10 w-10 shrink-0 items-center justify-center sm:h-11 sm:w-11">
        <Image
          src="/images/logo/ctg-one-coin-icon.png"
          alt=""
          width={88}
          height={88}
          priority={priority}
          className="h-full w-full object-contain"
          sizes="44px"
        />
      </span>

      <span className="flex min-w-0 flex-col justify-center leading-none">
        <span className="whitespace-nowrap text-[15px] font-semibold tracking-[-0.02em] sm:text-[17px]">
          <span className={primaryTextClass}>CTG </span>
          <span className="text-[#e8bf58]">One</span>
        </span>
        {!compact && (
          <span className={`mt-1 whitespace-nowrap text-[8px] font-medium uppercase tracking-[0.28em] sm:text-[9px] ${secondaryTextClass}`}>
          <span className={primaryText}>CTG </span>
          <span className="text-[#e8bf58]">One</span>
        </span>
        {!compact && (
          <span className={`mt-1 whitespace-nowrap text-[8px] font-medium uppercase tracking-[0.28em] sm:text-[9px] ${descriptorText}`}>
            Technology
          </span>
        )}
      </span>
    </span>
  );
}
