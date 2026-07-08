// Utility helpers
export function formatName(name) {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function calculateTotal(numbers) {
  return numbers.reduce((sum, n) => sum + n, 0);
}

export function multiply(a, b) {
  return a * b;
}
