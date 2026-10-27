/**
 * Common validation message templates and error message strings.
 * Supports class-validator replacement tokens ($property, $constraint1, etc.).
 */
export enum ValidationMessage {
  // Generic validation messages
  REQUIRED = '$property should not be empty',
  IS_STRING = '$property must be a string',
  IS_EMAIL = '$property must be an email',
  IS_BOOLEAN = '$property must be a boolean',
  IS_UUID = '$property must be a valid UUID',
  IS_DATE_STRING = '$property must be a valid ISO 8601 date string',
  IS_INT = '$property must be an integer number',
  IS_IN = '$property must be one of the following values: $constraint1',
  IS_ENUM = '$property must be a valid enum value',
  MAX_LENGTH = '$property must be shorter than or equal to $constraint1 characters',
  MIN_LENGTH = '$property must be longer than or equal to $constraint1 characters',
  MIN = '$property must not be less than $constraint1',
  MAX = '$property must not be greater than $constraint1',

  // Domain-specific custom messages
  CODE_FORMAT = 'code must be in the format SVyyNNNNNN or GVyyNNNNNN (e.g. SV26000001)',
  ROLE_INVALID = 'role must be either LECTURER or STUDENT',
}
