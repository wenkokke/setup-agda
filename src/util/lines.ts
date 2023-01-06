export function splitLines(string: string): string[] {
  return string
    .split(/\r?\n/g)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
}
