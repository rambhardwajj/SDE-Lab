

import { Router } from "express";
import { forgetPasswrod, getAllSessions, loginUser, logoutAllSessions, logoutFromSessionId, logoutUser, refreshAccessToken, registerUser, resendEmailVerification, resetPassword, verifyUser } from "../controllers/user.controller";
import { upload } from "../middlewares/multer.middleware";
import { isLoggedIn } from "../middlewares/auth.middleware";

const router = Router()

router.post('/auth/register', upload.single("avatar") ,  registerUser)
router.get('/auth/verify/:token',  verifyUser)
router.get('/auth/resend-verification', resendEmailVerification)
router.get('/auth/logout', isLoggedIn,  logoutUser)
router.get('/auth/login', loginUser)
router.get('/auth/forgetPassword',  forgetPasswrod)
router.get('/auth/resetPassword', isLoggedIn,  resetPassword)
router.get('/auth/refreshAccessToken', refreshAccessToken )
router.get('/auth/logoutSessions', isLoggedIn, logoutAllSessions)
router.get('/auth/getAllSessions', isLoggedIn, getAllSessions)
router.get('/auth/deleteBySessionId', isLoggedIn, logoutFromSessionId)


export default router