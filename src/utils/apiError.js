class ApiError{
    constructor(statusCode, message) {
        this.success = false
        this.statusCode = statusCode
        this.message = message
    }
}


export {ApiError}