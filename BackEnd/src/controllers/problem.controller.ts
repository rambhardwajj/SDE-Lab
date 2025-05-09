import { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { handleZodError } from "../utils/handleZodErrors";
import {
  validateProblem,
  validateUpdateProblem,
} from "../validators/problem.validators";
import { db } from "../configs/db";
import { CustomError } from "../utils/CustomError";
import { ApiResponse } from "../utils/ApiResponse";
import { ResponseStatus } from "../utils/constants";
import { Difficulty } from "../generated/prisma";

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

  if (existingProblem) {
    throw new CustomError(400, "Problem already exists ");
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

  res
    .status(200)
    .json(
      new ApiResponse(ResponseStatus.Success, newProblem, "Problem Created")
    );
});

const getAllProblems = asyncHandler(async (req, res) => {
  const problems = await db.problem.findMany();
  if (!problems) throw new CustomError(400, "problems does not exists");
  return res
    .status(200)
    .json(
      new ApiResponse(ResponseStatus.Success, problems, "problems Retrieved")
    );
});

const getProblemById = asyncHandler(async (req, res) => {
  const { problemId } = req.params;
  if (!problemId) throw new CustomError(400, "problemId does not exists");

  const problem = await db.problem.findUnique({
    where: {
      id: problemId,
    },
  });

  if (!problem) throw new CustomError(400, "problem does not exists");

  res.status(200).json(new ApiResponse(200, problem, "Problem Retrieved"));
});

const updateProblem = asyncHandler(async (req, res) => {
  const { problemId } = req.params;
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
  } = handleZodError(validateUpdateProblem(req.body));

  const problem = await db.problem.findFirst({
    where:{
      id: problemId,
    }
  })

  if(!problem) throw new CustomError(400, "problem does not exists");

  const updatedPayload: Partial<{
    title: string,
    difficulty: Difficulty,
    tags : string[],
    description: string,
    examples: any,
    hints: any,
    companies : any,
    constraints : any,
    followUp :any  ,
    editorial : any,
    codeSnippets : any ,
    testcases : any ,
    referenceSolutions : any ,
  }> = {}

  if(title !== undefined) updatedPayload.title = title
  if(difficulty !== undefined) updatedPayload.difficulty = difficulty
  if(tags !== undefined) updatedPayload.tags = tags
  if(description !== undefined) updatedPayload.description = description
  if(examples !== undefined) updatedPayload.examples = examples
  if(hints !== undefined) updatedPayload.hints = hints
  if(companies !== undefined) updatedPayload.companies = companies
  if(constraints !== undefined) updatedPayload.constraints = constraints
  if(followUp !== undefined) updatedPayload.followUp = followUp
  if(editorial !== undefined) updatedPayload.editorial = editorial
  if(codeSnippets !== undefined) updatedPayload.codeSnippets = codeSnippets
  if(testcases !== undefined) updatedPayload.testcases = testcases
  if(referenceSolutions !== undefined) updatedPayload.referenceSolutions = referenceSolutions

  if( Object.keys(updatedPayload).length ==0 ) throw new CustomError(400, "no valid fields to update")

  const updatedProblem = await db.problem.update({
    where:{
      id: problemId,
    },
    data:updatedPayload
  })

  res.status(200).json(new ApiResponse(200, updatedProblem, "Problem updated successfully"))

});

const deleteProblem = asyncHandler(async (req, res) => {
  const {projectId} = req.params;

  const deletedProblem = await db.problem.deleteMany({where:{id:projectId}});

  res.status(200).json(
    new ApiResponse(
      200,
      null,
      "Problem deleted successfully",
    )
  )
});

export { createProblem, getAllProblems, getProblemById, updateProblem, deleteProblem };
