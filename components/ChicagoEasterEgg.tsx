'use client';

export default function ChicagoEasterEgg() {
  return (
    <span
      className="cursor-default select-none"
      onClick={() => window.dispatchEvent(new CustomEvent('chicago-tap'))}
    >
      Chicago
    </span>
  );
}
