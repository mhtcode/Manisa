import Image from "next/image";

export function BrandLogo({
  size = 40,
  className = "",
  priority = false,
  alt = "Manisa studio logo",
}: {
  size?: number;
  className?: string;
  priority?: boolean;
  alt?: string;
}) {
  return (
    <Image
      alt={alt}
      className={`shrink-0 object-contain ${className}`}
      height={size}
      priority={priority}
      src="/brand/manisa-logo.webp"
      width={size}
    />
  );
}
