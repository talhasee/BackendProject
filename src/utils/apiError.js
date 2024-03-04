/*********************CLASS FOR GENERALIZING ERROR*************************/ 

class apiError extends Error{
    constructor(
        statusCode, 
        message = "Something went wrong",
        errors = [],
        stack = ""
    ){
        //overriding values with params
        super(message);
        this.statusCode = statusCode;
        this.data = null //need to read about this data field
        this.success = false;
        this.errors = errors;

        //For properly tracking the stacktrace
        if(stack){
            this.stack = stack;
        }
        else{
            Error.captureStackTrace(this, this.constructor);
        }
    }
}


export default apiError;