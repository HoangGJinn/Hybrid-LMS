import { isAxiosError } from 'axios';

const DEFAULT_MESSAGE = 'Something went wrong. Please try again.';

/** Human-readable message for any error thrown by the API layer (backend filter: `{ message }`). */
export const getErrorMessage = (
  error: unknown,
  fallback: string = DEFAULT_MESSAGE,
): string => {
  if (isAxiosError(error)) {
    const message: unknown = error.response?.data?.message;
    if (typeof message === 'string' && message) return message;
    if (Array.isArray(message) && message.length > 0) return message.join(', ');
    if (!error.response) return 'Cannot reach the server. Check your connection.';
    if (error.response.status === 403)
      return 'You do not have permission to do this.';
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};
