import monogram from "../../../../assets/brand/logo/hv-monogram-small.svg?raw";
import lockup from "../../../../assets/brand/logo/hv-lockup-horizontal.svg?raw";
import wordmark from "../../../../assets/brand/logo/hv-wordmark.svg?raw";

/**
 * The traced logo, inlined so it takes `currentColor` (yellow on the black header,
 * ink on light grounds). The <title> inside the SVG gives it its accessible name.
 */
export function Lockup({ className }: { className?: string }) {
  return <span className={className} dangerouslySetInnerHTML={{ __html: lockup }} />;
}

export function Wordmark({ className }: { className?: string }) {
  return <span className={className} dangerouslySetInnerHTML={{ __html: wordmark }} />;
}


/** The HV monogram tile (decorative: the name is always written next to it). */
export function Monogram({ className }: { className?: string }) {
  return <span aria-hidden="true" className={className} dangerouslySetInnerHTML={{ __html: monogram.replace(/<title>.*?<\/title>/, "") }} />;
}
