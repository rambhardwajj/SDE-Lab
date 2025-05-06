import { Response, Request, NextFunction, RequestHandler } from "express";

const asyncHandler =
  (handler: (res: Request, req: Response, next: NextFunction) => Promise<any>): 
  RequestHandler => (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };

export { asyncHandler };
