import { Request, Response } from "express";

const healthCheck = (req: Request, res: Response ) =>{
    res.status(200).send({ message: "Server is running" });
}

export {healthCheck}