import type { ValidationIssue, ValidationResult } from '@/types';

/** Small builder so engines can express validation declaratively. */
export class ValidationCollector {
  private readonly issues: ValidationIssue[] = [];

  /** Record a problem. No-op in `valid` mode for paths that are fine. */
  add(path: string, message: string): this {
    this.issues.push({ path, message });
    return this;
  }

  /** Record a problem only when `condition` is true. */
  addIf(condition: boolean, path: string, message: string): this {
    if (condition) this.add(path, message);
    return this;
  }

  get count(): number {
    return this.issues.length;
  }

  toResult(): ValidationResult {
    return this.issues.length === 0 ? { valid: true } : { valid: false, issues: [...this.issues] };
  }
}

export function validResult(): ValidationResult {
  return { valid: true };
}

export function invalidResult(...issues: ValidationIssue[]): ValidationResult {
  return { valid: false, issues };
}

/** Flatten a validation result into a single readable sentence. */
export function describeIssues(result: ValidationResult): string {
  if (result.valid) return '';
  return result.issues.map((issue) => `${issue.path}: ${issue.message}`).join('; ');
}

export function assertValid(result: ValidationResult, context: string): void {
  if (!result.valid) {
    throw new Error(`${context} received invalid input — ${describeIssues(result)}`);
  }
}
