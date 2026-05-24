export async function getHealth(): Promise<Record<string, string>> {
  return {
    status: 'ok',
    service: 'snack-builder-bakery-api',
  };
}
