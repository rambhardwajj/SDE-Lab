import { db } from "../configs/db";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";

const getAllUserSubmission = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const submissions = await db.submission.findMany({
    where: {
      userId: userId,
    },
  });
  res
    .status(200)
    .json(
      new ApiResponse(200, submissions, "Submissions Retrieved Successfully")
    );
});

const getUserSubmissionsForProblem = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const problemId = req.params.problemId;
  const submissions = await db.submission.findMany({
    where: {
      userId: userId,
      problemId: problemId,
    },
  });
  res
    .status(200)
    .json(
      new ApiResponse(200, submissions, "Submissions Retrieved Successfully")
    );
});

const getAllSubmissionsForProblem = asyncHandler(async (req, res) => {
  const problemId = req.params.problemId;
  const submission = await db.submission.count({
    where: {
      problemId: problemId,
    },
  });
  res.status(200).json(new ApiResponse(200, submission, "Submissions Retrieved Successfully"));
});

export {getAllSubmissionsForProblem, getAllUserSubmission, getUserSubmissionsForProblem };
