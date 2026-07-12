// Utility module for data processing
// Generated as a test fixture

interface DataPoint {
  id: number;
  name: string;
  value: number;
  category: string;
  timestamp: Date;
}

interface ProcessingResult {
  total: number;
  average: number;
  min: number;
  max: number;
  count: number;
}

function createDataPoint(id: number, name: string, value: number): DataPoint {
  return {
    category: categorize(value),
    id,
    name,
    timestamp: new Date(),
    value,
  };
}

function categorize(value: number): string {
  if (value < 10) {
    return "low";
  }
  if (value < 50) {
    return "medium";
  }
  if (value < 90) {
    return "high";
  }
  return "critical";
}

function processData(points: DataPoint[]): ProcessingResult {
  if (points.length === 0) {
    return { average: 0, count: 0, max: 0, min: 0, total: 0 };
  }

  let total = 0;
  let min = Infinity;
  let max = -Infinity;

  for (const point of points) {
    total += point.value;
    if (point.value < min) {
      min = point.value;
    }
    if (point.value > max) {
      max = point.value;
    }
  }

  return {
    average: total / points.length,
    count: points.length,
    max,
    min,
    total,
  };
}

function filterByCategory(points: DataPoint[], category: string): DataPoint[] {
  return points.filter((p) => p.category === category);
}

function sortByValue(points: DataPoint[], ascending = true): DataPoint[] {
  return [...points].sort((a, b) => (ascending ? a.value - b.value : b.value - a.value));
}

function groupByCategory(points: DataPoint[]): Map<string, DataPoint[]> {
  const groups = new Map<string, DataPoint[]>();
  for (const point of points) {
    const group = groups.get(point.category) ?? [];
    group.push(point);
    groups.set(point.category, group);
  }
  return groups;
}

function generateSampleData(count: number): DataPoint[] {
  const names = ["alpha", "beta", "gamma", "delta", "epsilon"];
  const results: DataPoint[] = [];
  for (let i = 0; i < count; i++) {
    const name = names[i % names.length] ?? "unknown";
    const value = Math.floor(Math.random() * 100);
    results.push(createDataPoint(i, name, value));
  }
  return results;
}

function formatResult(result: ProcessingResult): string {
  const lines = [
    `Total: ${result.total}`,
    `Average: ${result.average.toFixed(2)}`,
    `Min: ${result.min}`,
    `Max: ${result.max}`,
    `Count: ${result.count}`,
  ];
  return lines.join("\n");
}

function validateDataPoint(point: DataPoint): boolean {
  if (point.id < 0) {
    return false;
  }
  if (point.name.length === 0) {
    return false;
  }
  if (point.value < 0 || point.value > 100) {
    return false;
  }
  if (!["low", "medium", "high", "critical"].includes(point.category)) {
    return false;
  }
  return true;
}

function mergeResults(a: ProcessingResult, b: ProcessingResult): ProcessingResult {
  return {
    average: (a.total + b.total) / (a.count + b.count),
    count: a.count + b.count,
    max: Math.max(a.max, b.max),
    min: Math.min(a.min, b.min),
    total: a.total + b.total,
  };
}

export {
  createDataPoint,
  processData,
  filterByCategory,
  sortByValue,
  groupByCategory,
  generateSampleData,
  formatResult,
  validateDataPoint,
  mergeResults,
};

export type { DataPoint, ProcessingResult };
