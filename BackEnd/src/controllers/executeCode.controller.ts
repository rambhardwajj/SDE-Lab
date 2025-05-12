import e from "express";
import { db } from "../configs/db";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { CustomError } from "../utils/CustomError";
import { languageCodes, pollBatchResults, submitBatch } from "../utils/judge0";
import {
  referenceSolutionSchema,
  testcaseSchema,
} from "../validators/problem.validators";

const executeCode = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { source_code, language_id, stdin } = req.body;
  const { problemId } = req.params;
  const { type } = req.params;

  const problem = await db.problem.findUnique({
    where: { id: problemId },
  });
  
  if (!problem) throw new CustomError(404, "Problem not found");
  
  // handle submit
  if (type === "submit") {
    const parsed = testcaseSchema.safeParse(problem.testcases);
    if (!parsed.success)
      throw new CustomError(500, "Invalid testcases format in DB");

    const testcases = parsed.data;
    const inputs = testcases.map((tc) => tc.input);
    const expectedOutputs = testcases.map((tc) => tc.expectedOutput.trim());

    const submissions = testcases.map((tc) => ({
      source_code,
      language_id,
      stdin: tc.input,
      expected_output: tc.expectedOutput,
    }));

    const submitResponse = await submitBatch(submissions);
    const tokens = submitResponse.map((res) => res.token);
    const results = await pollBatchResults(tokens);

    let allPassed = true;
    const detailedResults = results.map((result, i) => {
      const actual = result.stdout?.trim() || "";
      const expected = expectedOutputs[i];
      const passed = actual === expected;
      if (!passed) allPassed = false;

      //submission saving logic
      return {
        testCase: i + 1,
        passed: passed,
        stdout: result.stdout,
        stderr: result.stderr,
        userOutput: actual,
        expectedOutput: expected,
        input: inputs[i],
        time: result.time,
        memory: result.memory,
        message: result.message,
        compile_output: result.compile_output,
        error: result.stderr,
        status: result.status,
      };
    });

    // Create a submission
    const createdSubmission = await db.submission.create({
      data: {
        userId,
        problemId,
        submittedCode: source_code,
        language: languageCodes[language_id as keyof typeof languageCodes],
        stdin: stdin.join("\n"),
        stdout: JSON.stringify(detailedResults.map((r: any) => r.stdout)),
        stderr: detailedResults.some((r: any) => r.stderr)
          ? JSON.stringify(detailedResults.map((r: any) => r.stderr))
          : null,
        compileOutput: detailedResults.some((r: any) => r.compile_output)
          ? detailedResults.map((r: any) => r.compile_output).join("\n")
          : null,
        status: allPassed === true ? "Accepted" : "Wrong Answer",
        memory:
          detailedResults.reduce(
            (acc: number, r: any) => acc + (r.memory || 0),
            0
          ) / detailedResults.length,
        time: detailedResults.some((r: any) => r.time)
          ? JSON.stringify(detailedResults.map((r: any) => r.time))
          : null,
      },
    });

    const message =
      allPassed === true ? "Submission successfull" : "Submission failed";

    // Create ProblemSolved
    if (allPassed) {
      await db.problemSolved.upsert({
        where: {
          userId_problemId: {
            userId,
            problemId,
          },
        },
        update: {},
        create: {
          userId,
          problemId,
        },
      });
    }

    // Create a testCase result
    const testCaseResults = detailedResults.map((result) => ({
      submissionId: createdSubmission.id,
      testCase: result.testCase,
      passed: result.passed,
      stdout: result.stdout,
      expected: result.expectedOutput,
      stderr: result.stderr,
      compileOutput: result.compile_output,
      status: result.status.description,
      memory: result.memory,
      time: result.time,
    }));

    const testCaseResult = await db.testCaseResult.createMany({
      data: testCaseResults,
    });

    const submissionWithTestCase = await db.submission.findUnique({
      where:{
        id: createdSubmission.id
      },
      include: {
        testCases: true
      }
    })

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          success: allPassed,
          codeExecutionResults: detailedResults,
          newSubmission: createdSubmission,
          testCaseResults: testCaseResult,
          submissionWithTestCase: submissionWithTestCase
        },
        message
      )
    );
  }

  // handle run
  if (type === "run") {
    // user ke code ko uske inputs pe run kro and userOutputs mai populate kro
    if (!Array.isArray(stdin) || stdin.length === 0) {
      throw new CustomError(400, "Invalid input");
    }

    const userSubmissions = stdin.map((input) => ({
      source_code,
      language_id,
      stdin: input,
    }));

    const userObjTokens = await submitBatch(userSubmissions);
    const userTokens = userObjTokens.map((r) => r.token);
    const userResults = await pollBatchResults(userTokens);
    const userOutputs: string[] = [];

    for (let i = 0; i < userResults.length; i++) {
      const output = userResults[i].stdout?.trim() || "";
      userOutputs.push(output);
    } // abh yahan user ke code pe run krke ke baad->  outputs mill gye hain custom testcases pe

    // Refrence Solution waale code ko user ke custom input pe run krke expected outputs nikalo
    const allRefs = referenceSolutionSchema.safeParse(
      problem.referenceSolutions
    );
    if (!allRefs.success) {
      throw new CustomError(500, "Invalid reference solutions");
    }
    const allRefsSolutions = allRefs.data;

    // language nikalo to jo user ke code pe hai
    const currLanguage =
      languageCodes[language_id as keyof typeof languageCodes];
    console.log(currLanguage);

    const requiredRefSolution = allRefsSolutions.find(
      (solution) => solution.language === currLanguage
    );

    if (!requiredRefSolution)
      throw new CustomError(
        500,
        "Refrence solution of this language does not exists"
      );

    // Reference solution ke code ko run krke expected outputs nikalo
    // custom inputs (stdin) pr run kro reqired Ref solution ko
    const refSubmissions = stdin.map((input) => ({
      source_code: requiredRefSolution.code,
      language_id,
      stdin: input,
    }));

    const refTokensObjArray = await submitBatch(refSubmissions);
    const refTokens = refTokensObjArray.map((r) => r.token);
    const refResults = await pollBatchResults(refTokens);
    let refOutputs: string[] = [];

    for (let i = 0; i < refResults.length; i++) {
      const output = refResults[i].stdout?.trim() || "";
      refOutputs.push(output);
    }
    console.log("refOutputs--------------------------------");
    console.log(refOutputs);

    const results = refOutputs.map((refOutput, i) => {
      const userOutput = userOutputs[i];
      const expectedRefOutput = refOutput;
      return {
        testCase: i + 1,
        passed: userOutput === expectedRefOutput,
        userOutput,
        expectedRefOutput,
        input: stdin[i],
        time: refResults[i].time,
        memory: refResults[i].memory,
        message: refResults[i].message,
        compile_output: refResults[i].compile_output,
        error: refResults[i].stderr,
      };
    });

    const allPassed = results.every((r) => r.passed);
    const message: string = allPassed
      ? "All test cases passed"
      : "Test cases failed";
    return res
      .status(200)
      .json(new ApiResponse(200, { success: allPassed, results }, message));
  }
});

export { executeCode };
