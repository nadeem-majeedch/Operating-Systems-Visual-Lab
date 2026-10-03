export type ClassValue = string | false | null | undefined;

/** Join truthy class names: `cn('card', isActive && 'card--active')`. */
export function cn(...values: ClassValue[]): string {
  return values.filter((value): value is string => Boolean(value)).join(' ');
}
