import { type CSSProperties } from "react";

export function Icon({
  name,
  className = "",
  filled = false,
  weight = 400,
  size,
}: {
  name: string;
  className?: string;
  filled?: boolean;
  weight?: 300 | 400 | 500 | 600 | 700;
  size?: number;
}) {
  const style: CSSProperties = {
    fontVariationSettings: `"FILL" ${filled ? 1 : 0}, "wght" ${weight}, "GRAD" 0, "opsz" 24`,
    fontSize: size ? `${size}px` : undefined,
  };
  return (
    <span className={`material-symbols-outlined leading-none ${className}`} style={style}>
      {name}
    </span>
  );
}
