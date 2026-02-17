class CustomError extends Error {
    constructor(errorMessage) {
        super(errorMessage);
        this.error = errorMessage;
    }
}

module.exports.CustomError = CustomError;