import React from 'react';

interface BrandMarkProps {
  size?: number;
}

/** Compact LabAttend mark for branded headers and navigation. */
export const BrandMark: React.FC<BrandMarkProps> = ({ size = 20 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <rect x="3.25" y="3.25" width="25.5" height="25.5" rx="8" stroke="currentColor" strokeWidth="2.2" />
    <path d="M10 10H13.5M10 10V13.5M22 10H18.5M22 10V13.5M10 22H13.5M10 22V18.5M22 22H18.5M22 22V18.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="m12.5 16.25 2.35 2.35 4.8-5.1" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
