
import { Router } from "express";
import { isLoggedIn } from "../middlewares/auth.middleware";
import { getAllSubmissionsForProblem, getAllUserSubmission, getUserSubmissionsForProblem } from "../controllers/submisstion.controller";

const router = Router();

router.get('/getAllUserSubmissions', isLoggedIn, getAllUserSubmission)
router.get('/getUserSubmissionsForProblem/:problemId', isLoggedIn, getUserSubmissionsForProblem)
router.get('/getAllSubmissionsForProblem/:problemId', isLoggedIn, getAllSubmissionsForProblem)
export default router