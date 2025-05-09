import express, { Router } from "express";
import { isAdmin, isLoggedIn } from "../middlewares/auth.middleware";
import { createProblem, getAllProblems, getProblemById, updateProblem } from "../controllers/problem.controller";

const router = Router()
router.use(isLoggedIn)

router.post("/create", isLoggedIn, isAdmin, createProblem);
router.get('/getAll', getAllProblems);
router.get("/get-problem/:id", getProblemById);
router.put("/update/:problemId", isLoggedIn, isAdmin, updateProblem);
// router.delete("/delete-problem/:id", isLoggedIn, isAdmin, deleteProblem);
// router.get('/getSolvedProblem', isLoggedIn, getSolvedProblem);

export default router;