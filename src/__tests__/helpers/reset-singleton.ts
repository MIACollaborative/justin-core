export function resetSingleton(constructor: any): void {
  try {
    (constructor as any).killInstance?.();
  } catch {
    /* ignore */
  }
}
