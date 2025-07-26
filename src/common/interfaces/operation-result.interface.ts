export interface IOperationResult<T> {
    success: boolean;
    data?: T;
    error?: string;
    validationErrors?: Record<string, string[]>;
  }