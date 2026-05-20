import express from 'express';
import { getUser, signup, signin, saveSubjects, getUserProfile, updateUserProfile, verifyToken, changePassword, requestPasswordOTP, forgotPasswordOTP, forgotPasswordReset, requestSignupOTP } from "../controllers/users.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();


router.get("/", getUser);

router.post("/signup/otp", requestSignupOTP);
router.post("/signup", signup);
router.post("/signin", signin);
router.get("/verify", authMiddleware, verifyToken);

router.post("/forgot-password/otp", forgotPasswordOTP);
router.post("/forgot-password/reset", forgotPasswordReset);

router.post("/me/subjects", authMiddleware, saveSubjects);
router.get("/me", authMiddleware, getUserProfile);
router.patch("/me", authMiddleware, updateUserProfile);
router.post("/me/password/otp", authMiddleware, requestPasswordOTP);
router.post("/me/password", authMiddleware, changePassword);

export default router;