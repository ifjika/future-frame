export abstract class AppError extends Error {
  public abstract readonly statusCode: number;
  public abstract readonly errorCode: string;

  constructor(
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class IngestError extends AppError {
  public readonly statusCode = 422;
  public readonly errorCode = 'ERR_MEDIA_PROBE_FAILED';

  constructor(message: string, details?: unknown) {
    super(message, details);
  }
}

export class ValidationError extends AppError {
  public readonly statusCode = 400;
  public readonly errorCode = 'ERR_VALIDATION_FAILED';

  constructor(message: string, details?: unknown) {
    super(message, details);
  }
}

export class PreprocessError extends AppError {
  public readonly statusCode = 422;
  public readonly errorCode = 'ERR_MEDIA_PREPROCESS_FAILED';

  constructor(message: string, details?: unknown) {
    super(message, details);
  }
}

export class InferenceError extends AppError {
  public readonly statusCode = 502;
  public readonly errorCode = 'ERR_AI_INFERENCE_FAILED';

  constructor(message: string, details?: unknown) {
    super(message, details);
  }
}

export class RenderError extends AppError {
  public readonly statusCode = 500;
  public readonly errorCode = 'ERR_MEDIA_RENDER_FAILED';

  constructor(message: string, details?: unknown) {
    super(message, details);
  }
}
