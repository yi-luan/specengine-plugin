// System-wide unique, deterministic event ids. One counter is shared by every
// service instance in the process, so ids never collide even across services
// that use the same prefix.
let counter = 0;

export function nextEventId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter}`;
}
