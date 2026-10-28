import { describe, it, expect } from 'vitest';
import { AxiosError } from 'axios';
import { getErrorMessage } from './errors';

const axiosError = (status: number | null, data?: unknown): AxiosError => {
  const error = new AxiosError(
    status ? `Request failed with status code ${status}` : 'Network Error',
  );
  if (status) {
    error.response = { status, data } as AxiosError['response'];
  }
  return error;
};

describe('getErrorMessage', () => {
  it('shows the server message instead of the axios one', () => {
    const error = axiosError(409, {
      message: 'Nguyen Van A (SV26000001) is already a participant of this class',
    });

    expect(getErrorMessage(error)).toBe(
      'Nguyen Van A (SV26000001) is already a participant of this class',
    );
  });

  it('joins validation messages sent as an array', () => {
    const error = axiosError(400, { message: ['studentIds must not be empty', 'x'] });

    expect(getErrorMessage(error)).toBe('studentIds must not be empty, x');
  });

  it('explains a 403 that has no message', () => {
    expect(getErrorMessage(axiosError(403, {}))).toBe(
      'You do not have permission to do this.',
    );
  });

  it('explains a network failure', () => {
    expect(getErrorMessage(axiosError(null))).toBe(
      'Cannot reach the server. Check your connection.',
    );
  });

  it('uses the message of a plain Error', () => {
    expect(getErrorMessage(new Error('boom'))).toBe('boom');
  });

  it('falls back for anything else, and honours a custom fallback', () => {
    expect(getErrorMessage('nope')).toBe('Something went wrong. Please try again.');
    expect(getErrorMessage(undefined, 'Could not add')).toBe('Could not add');
  });
});
