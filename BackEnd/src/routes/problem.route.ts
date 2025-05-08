import express, { Router } from "express";
import { isAdmin, isLoggedIn } from "../middlewares/auth.middleware";

const router = Router()
router.use(isLoggedIn)

// router.post("/create-problem", isLoggedIn, isAdmin, createProblem);
// router.get('/get-all-problem', getAllProblems);
// router.get("/get-problem/:id", getProblemById);
// router.put("/update-problem/:id", isLoggedIn, isAdmin, updateProblem);
// router.delete("/delete-problem/:id", isLoggedIn, isAdmin, deleteProblem);
// router.get('/getSolvedProblem', isLoggedIn, getSolvedProblem);