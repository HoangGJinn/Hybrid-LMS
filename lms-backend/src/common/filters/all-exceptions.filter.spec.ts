import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HttpException, HttpStatus, BadRequestException } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter.js';

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let mockResponse: any;
  let mockRequest: any;
  let mockHost: any;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockRequest = {
      method: 'POST',
      url: '/api/users',
    };
    mockHost = {
      switchToHttp: vi.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    };
  });

  it('handles standard HttpException with string message', () => {
    const exception = new HttpException('Resource not found', HttpStatus.NOT_FOUND);

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 404,
        message: 'Resource not found',
        path: '/api/users',
      }),
    );
  });

  it('preserves array of validation error messages from ValidationPipe', () => {
    const validationErrors = [
      'email must be an email',
      'fullName should not be empty',
    ];
    const exception = new BadRequestException(validationErrors);

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 400,
        message: validationErrors,
        path: '/api/users',
      }),
    );
  });

  it('extracts field property when present in exception response body', () => {
    const exception = new HttpException(
      { message: 'Email already exists', field: 'email' },
      HttpStatus.CONFLICT,
    );

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(409);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 409,
        message: 'Email already exists',
        field: 'email',
      }),
    );
  });

  it('handles unknown non-HttpException errors gracefully as 500', () => {
    const error = new Error('Database connection failed');

    filter.catch(error, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 500,
        message: 'Internal server error',
      }),
    );
  });
});
