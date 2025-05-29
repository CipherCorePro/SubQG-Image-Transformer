
export const calculateMean = (arr: number[]): number => {
  if (arr.length === 0) return 0;
  return arr.reduce((sum, val) => sum + val, 0) / arr.length;
};

export const calculateMedian = (arr: number[]): number => {
  if (arr.length === 0) return 0;
  const sortedArr = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sortedArr.length / 2);
  return sortedArr.length % 2 !== 0 ? sortedArr[mid] : (sortedArr[mid - 1] + sortedArr[mid]) / 2;
};

export const calculateStdDev = (arr: number[]): number => {
  if (arr.length <= 1) return 0; // Or 1.0 as in Python code for some cases. Let's be consistent: std of 1 item is 0.
  const mean = calculateMean(arr);
  const variance = arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length;
  return Math.sqrt(variance);
};

// Peak to peak (range)
export const calculatePtp = (arr: number[]): number => {
  if (arr.length === 0) return 0;
  return Math.max(...arr) - Math.min(...arr);
};

// Helper for meshgrid-like x coordinates
export const linspace = (start: number, stop: number, num: number): number[] => {
  const arr: number[] = [];
  const step = (stop - start) / (num - 1);
  for (let i = 0; i < num; i++) {
    arr.push(start + (step * i));
  }
  return arr;
};

// Clamp a number between min and max
export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};
