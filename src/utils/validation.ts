import { ValidationError } from './errors';

export function validateAddress(address: string): void {
  if (!address || typeof address !== 'string') {
    throw new ValidationError('Address must be a non-empty string');
  }
  // Basic Polkadot address validation (SS58 format)
  if (address.length < 32 || address.length > 48) {
    throw new ValidationError('Invalid address format');
  }
}

export function validateAmount(amount: string | number): string {
  const amountStr = typeof amount === 'number' ? amount.toString() : amount;
  
  if (!amountStr || amountStr.trim() === '') {
    throw new ValidationError('Amount cannot be empty');
  }

  const amountNum = parseFloat(amountStr);
  if (isNaN(amountNum) || amountNum <= 0) {
    throw new ValidationError('Amount must be a positive number');
  }

  return amountStr;
}

export function validatePoolId(poolId: number): void {
  if (!Number.isInteger(poolId) || poolId < 0) {
    throw new ValidationError('Pool ID must be a non-negative integer');
  }
}

export function validateMinimumAmount(amount: string, minimum: string): void {
  const amountNum = BigInt(amount);
  const minimumNum = BigInt(minimum);
  
  if (amountNum < minimumNum) {
    throw new ValidationError(
      `Amount ${amount} is below minimum required ${minimum}`
    );
  }
}
