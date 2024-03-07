class apiResponse{
    constructor(
        statusCode,
        data, 
        message = "Success",
    ){
        this.statusCode = statusCode;
        this.data = data;
        this.message = message;
        //usually according to standard or best practices success codes are less than 400
        this.success = statusCode < 400 
    }
}

export {apiResponse};