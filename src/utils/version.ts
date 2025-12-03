/**
 * Compare two version strings (e.g., "8.15.3" vs "8.19.7")
 * Returns: -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2
 */
export function compareVersions(v1: string, v2: string): number {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  const maxLength = Math.max(parts1.length, parts2.length);
  
  for (let i = 0; i < maxLength; i++) {
    const part1 = parts1[i] || 0;
    const part2 = parts2[i] || 0;
    
    if (part1 < part2) return -1;
    if (part1 > part2) return 1;
  }
  
  return 0;
}

/**
 * Get the highest version from an array of version strings
 */
export function getHighestVersion(versions: string[]): string | null {
  if (versions.length === 0) return null;
  
  return versions.reduce((highest, current) => {
    if (compareVersions(current, highest) > 0) {
      return current;
    }
    return highest;
  });
}

