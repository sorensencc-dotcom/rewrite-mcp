export const version = "3.0.0";

export async function bootstrap(config: any): Promise<void> {
  console.log("Core bootstrap", config);
}

export function validate(data: unknown): boolean {
  if (typeof data !== 'object' || data === null) return false;
  return true;
}
