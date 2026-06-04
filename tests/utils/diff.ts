export function diffStrings(a: string, b: string): string {
  const aLines = a.split("\n");
  const bLines = b.split("\n");

  const diffs: string[] = [];
  const max = Math.max(aLines.length, bLines.length);

  for (let i = 0; i < max; i++) {
    const left = aLines[i] || "";
    const right = bLines[i] || "";

    if (left.trim() !== right.trim()) {
      diffs.push(`- ${left}`);
      diffs.push(`+ ${right}`);
    }
  }

  return diffs.join("\n");
}

export function hasDiff(expected: string, actual: string): boolean {
  return expected.trim() !== actual.trim();
}
