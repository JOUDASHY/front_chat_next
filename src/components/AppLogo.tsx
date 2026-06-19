import Image from 'next/image';

interface AppLogoProps {
  size?: number;
  className?: string;
}

export default function AppLogo({ size = 70, className = '' }: AppLogoProps) {
  return (
    <Image
      src="/logo.png"
      alt="Logo"
      width={size}
      height={size}
      priority
      unoptimized
      className={className}
      style={{
        maxWidth: '100%',
        height: 'auto',
        filter: 'drop-shadow(0 0 1px #f68c09) drop-shadow(0 0 1px #f68c09) drop-shadow(0 0 1px #f68c09)',
      }}
    />
  );
}
