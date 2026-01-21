export class StakingError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'StakingError';
  }
}

export class ValidationError extends StakingError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class NetworkError extends StakingError {
  constructor(message: string, details?: unknown) {
    super(message, 'NETWORK_ERROR', details);
    this.name = 'NetworkError';
  }
}

export class TransactionError extends StakingError {
  constructor(message: string, details?: unknown) {
    super(message, 'TRANSACTION_ERROR', details);
    this.name = 'TransactionError';
  }
}

export function handleError(error: unknown): StakingError {
  if (error instanceof StakingError) {
    return error;
  }

  if (error instanceof Error) {
    return new StakingError(error.message, 'UNKNOWN_ERROR', error);
  }

  return new StakingError('An unknown error occurred', 'UNKNOWN_ERROR', error);
}
