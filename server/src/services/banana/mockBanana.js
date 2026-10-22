const MOCK_PUZZLES = [
  { expression: '3 + 4', solution: 7 },
  { expression: '9 - 2', solution: 7 },
  { expression: '6 × 3', solution: 18 },
  { expression: '8 ÷ 2', solution: 4 },
  { expression: '5 + 5 + 1', solution: 11 },
  { expression: '12 - 7', solution: 5 },
  { expression: '4 × 4', solution: 16 },
  { expression: '15 ÷ 3', solution: 5 },
  { expression: '7 + 6', solution: 13 },
  { expression: '20 - 8', solution: 12 },
  { expression: '3 × 5', solution: 15 },
  { expression: '18 ÷ 6', solution: 3 },
];

let cursor = 0;

export function resetMockBananaCursor() {
  cursor = 0;
}

export function peekMockPuzzle(index = 0) {
  return MOCK_PUZZLES[index % MOCK_PUZZLES.length];
}

function svgDataUri(expression) {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="760" height="420" viewBox="0 0 760 420">
  <rect width="760" height="420" rx="28" fill="#fffaf0"/>
  <rect x="28" y="28" width="704" height="364" rx="22" fill="#ffffff" stroke="#f0e2b8"/>
  <text x="56" y="78" fill="#8a6a12" font-family="Georgia, serif" font-size="22">Simulated puzzle</text>
  <text x="380" y="220" text-anchor="middle" fill="#1b2a4a" font-family="Georgia, serif" font-size="72">${expression} = ?</text>
  <text x="380" y="300" text-anchor="middle" fill="#5c6b8a" font-family="Segoe UI, sans-serif" font-size="20">This card is local test data, not a Banana API image.</text>
</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

export function nextMockPuzzle() {
  const item = MOCK_PUZZLES[cursor % MOCK_PUZZLES.length];
  cursor += 1;
  return {
    externalId: `mock:${item.expression}`,
    imageUrl: svgDataUri(item.expression),
    solution: item.solution,
    source: 'mock',
    fallback: false,
  };
}
