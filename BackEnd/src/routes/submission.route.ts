
import { Router } from "express";
import { isLoggedIn } from "../middlewares/auth.middleware";
import { getAllSubmissionsForProblem, getAllUserSubmission, getUserSubmissionsForProblem } from "../controllers/submisstion.controller";

const router = Router();

router.get('/getAllUserSubmissions', isLoggedIn, getAllUserSubmission)
router.get('/getUserSubmissionsForProblem', isLoggedIn, getUserSubmissionsForProblem)
router.get('getAllSubmissionsForProblem', isLoggedIn, getAllSubmissionsForProblem)
export default router