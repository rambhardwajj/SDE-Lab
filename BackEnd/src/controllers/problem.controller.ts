import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { handleZodError } from "../utils/handleZodErrors";
import { validateProblem } from "../validators/problem.validators";
import { db } from "../configs/db";
import { CustomError } from "../utils/CustomError";
import { ApiResponse } from "../utils/ApiResponse";
import { ResponseStatus } from "../utils/constants";

const createProblem = asyncHandler(async (req: Request, res: Response) => {
  const {
    title,
    difficulty,
    tags,
    description,
    examples,
    hints,
    companies,
    constraints,
    followUp,
    editorial,
    codeSnippets,
    testcases,
    referenceSolutions,
  } = handleZodError(validateProblem(req.body));

  const existingProblem = await db.problem.findFirst({
    where: {
      title,
    },
  });

  if(existingProblem){
    throw new CustomError(400, "Problem already exists ")
  }

  const newProblem = await db.problem.create({
    data: {
      title,
      difficulty,
      tags,
      description,
      examples,
      hints,
      companies,
      createdByUserId: req.user.id,
      constraints,
      followUp,
      editorial,
      codeSnippets,
      testcases,
      referenceSolutions,
    },
  });

  res.status(200).json(new ApiResponse(ResponseStatus.Success ,newProblem, "Problem Created"))
});


export {createProblem}