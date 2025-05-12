import express, { Router } from "express";
import { isLoggedIn } from "../middlewares/auth.middleware";
import { executeCode } from "../controllers/executeCode.controller";

const router = Router()

router.post('/execute/:problemId/:type', isLoggedIn, executeCode)

export default router