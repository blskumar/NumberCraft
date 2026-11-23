import { type MarbleKind } from '@/lib/odds-urns-engine';

export const MARBLE_GRADIENTS: Record<MarbleKind, string> = {
  cobalt: 'radial-gradient(circle at 32% 28%, #60A5FA, #1D4ED8 60%, #1E3A8A)',
  emerald: 'radial-gradient(circle at 32% 28%, #34D399, #047857 60%, #064E3B)',
  hazard: 'radial-gradient(circle at 32% 28%, #FB7185, #BE123C 60%, #881337)',
};

export const DICE_PIP_COORDS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [
    [28, 28],
    [72, 72],
  ],
  3: [
    [28, 28],
    [50, 50],
    [72, 72],
  ],
  4: [
    [28, 28],
    [72, 28],
    [28, 72],
    [72, 72],
  ],
  5: [
    [28, 28],
    [72, 28],
    [50, 50],
    [28, 72],
    [72, 72],
  ],
  6: [
    [28, 25],
    [72, 25],
    [28, 50],
    [72, 50],
    [28, 75],
    [72, 75],
  ],
};

export const DICE_SUM_WAYS: { sum: number; ways: number }[] = [
  { sum: 2, ways: 1 },
  { sum: 3, ways: 2 },
  { sum: 4, ways: 3 },
  { sum: 5, ways: 4 },
  { sum: 6, ways: 5 },
  { sum: 7, ways: 6 },
  { sum: 8, ways: 5 },
  { sum: 9, ways: 4 },
  { sum: 10, ways: 3 },
  { sum: 11, ways: 2 },
  { sum: 12, ways: 1 },
];
