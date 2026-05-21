class AppError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
    this.name = this.constructor.name;
    this.isOperational = true; 
    
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;