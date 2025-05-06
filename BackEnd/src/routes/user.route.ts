

import { Router } from "express";
import { loginUser, logoutUser, registerUser, resendEmailVerification, verifyUser } from "../controllers/user.controller";
import { upload } from "../middlewares/multer.middleware";
import { isLoggedIn } from "../middlewares/auth.middleware";

const router = Router()

router.post('/auth/register', upload.single("avatar") ,  registerUser)
router.get('/auth/verify/:token',  verifyUser)
router.get('/auth/resend-verification', resendEmailVerification)
router.get('/auth/logout', isLoggedIn,  logoutUser)
router.get('/auth/login', loginUser)


export default router