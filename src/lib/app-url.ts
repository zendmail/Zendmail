export function appUrl(path: string) {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return `${base}${path}`;
}
