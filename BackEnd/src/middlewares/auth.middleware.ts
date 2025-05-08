import { NextFunction, Request, Response } from "express";
import { CustomError } from "../utils/CustomError";
import { ResponseStatus } from "../utils/constants";
import jwt from "jsonwebtoken"
import { envConfig } from "../configs/env";
import {Role} from "../generated/prisma"
import { DecodedUser } from "../types";


const isLoggedIn = async (req: Request, res: Response, next: NextFunction) =>{
    const token  = req.cookies?.accessToken;
    console.log("access " , token)

    if( !token){
        throw new CustomError(ResponseStatus.Unauthorized, "Invalid token, Login failed")
    }
    try {
        const decoded = jwt.verify(token, envConfig.ACCESS_TOKEN_SECRET) 
        console.log(decoded)
        req.user = decoded as DecodedUser
        next()
    } catch (error) {
        throw new CustomError(ResponseStatus.Unauthorized, "Invalid token, Login failed")
    }
}

const isAdmin = async( req: Request, res: Response, next: NextFunction) =>{
    const {role} = req.user;
    if( !role) throw new CustomError(400, "User role not found")

    if(role !== Role.ADMIN){
        throw new CustomError(ResponseStatus.BadRequest, "You are not an admin")
    }
    next()
}

export {isLoggedIn , isAdmin}