class ApiError{
    constructor(statusCode, message) {
        this.success = statusCode > 200
        this.statusCode = statusCode
        this.message = message
    }
}


export {ApiError}