import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Fix for Radix UI Select hasPointerCapture issue in jsdom
if (typeof Element !== 'undefined' && !Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = vi.fn();
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
}

