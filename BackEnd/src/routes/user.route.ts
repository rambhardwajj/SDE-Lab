

import { Router } from "express";
import { registerUser, verifyUser } from "../controllers/register.controller";
import { upload } from "../middlewares/multer.middleware";

const router = Router()

router.post('/auth/register', upload.single("avatar") ,  registerUser)
router.get('/auth/verify/:token',  verifyUser)

export default router