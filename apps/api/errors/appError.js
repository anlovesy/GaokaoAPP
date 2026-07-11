export class AppError extends Error {
  constructor(message, status = 500, code = "APP_ERROR") {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
  }
}

export class AuthError extends AppError {
  constructor(message, status = 401, code = "AUTH_ERROR") {
    super(message, status, code);
    this.name = "AuthError";
  }
}

export class PermissionError extends AppError {
  constructor(message, status = 403, code = "PERMISSION_DENIED") {
    super(message, status, code);
    this.name = "PermissionError";
  }
}
