import {NextFunction, Request, Response} from 'express';

export function handleExpressError(err : Error, req : Request, res : Response, next : NextFunction) {

    /**
     * Set a default status code and message for the error response.
     */
    const statusCode = res.statusCode !== 200 ? res.statusCode : 500;
    res.status(statusCode).json({
        error : {
            message : err.message,
            status : statusCode, 
        }
    });
}