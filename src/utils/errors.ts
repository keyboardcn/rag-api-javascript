// src/utils/errors.ts

/**
 * Custom HTTP Error class for consistent error responses.
 */
export class HttpError extends Error {
    statusCode: number;

    constructor(message: string, statusCode: number = 500) {
        super(message);
        this.name = 'HttpError';
        this.statusCode = statusCode;
        // This line is important for proper stack traces in Node.js
        Object.setPrototypeOf(this, HttpError.prototype);
    }
}