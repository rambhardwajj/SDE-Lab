import { NextFunction, Request, Response } from "express";
import { CustomError } from "../utils/CustomError";
import { ResponseStatus } from "../utils/constants";
import jwt from "jsonwebtoken"
import { envConfig } from "../configs/env";
import {Role} from "../generated/prisma"
import { DecodedUser } from "../types";


const isLoggedIn = (req: Request, res: Response, next: NextFunction) =>{
    const {accessToken}  = req.cookies;

    if( !accessToken){
        throw new CustomError(ResponseStatus.Unauthorized, "Invalid token, Login failed")
    }

    try {
        const decoded = jwt.verify(accessToken, envConfig.ACCESS_TOKEN_SECRET) as { id: string, userName: string, role: Role };
        req.user = decoded as DecodedUser
    } catch (error) {
        throw new CustomError(ResponseStatus.Unauthorized, "Invalid token, Login failed")
    }
}
export {isLoggedIn}