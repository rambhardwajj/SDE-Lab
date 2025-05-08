import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";

const createProblem = asyncHandler(async ( req: Request, res: Response) =>{
    const { title, difficulty, tags, description, examples, constraints,  } = req.body;
})