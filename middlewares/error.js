const ErrorResponse = require('../utils/errorResponse')

const errorHandler = (err, req, res, next) => {
    console.log(err)
    let error = { ...err }

    error.message = err.message
    //Mongoose bad ObjectID
    if (err?.name === 'CastError') {
        const message = `Resource not found`
        error = new ErrorResponse(message, 404)
    }

    //Mongoose duplicate key
    if (err.code == 11000) {
        const message = 'Duplicate Field value entered'
        error = new ErrorResponse(message, 400)
    }

    //Mongoose validation error
    // if (err.name == 'ValidationError') {
    //     const message = Object.values(err.errors).map((val) => val.message)
    //     error = new ErrorResponse(message, 400)
    //     console.log("🚀 ~ file: error.js:23 ~ errorHandler ~ error:", error)
    // }
    
    res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || 'Server Error',
    })
}

module.exports = errorHandler