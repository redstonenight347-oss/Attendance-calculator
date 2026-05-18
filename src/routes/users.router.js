import express from 'express';
import { getUser, signup, signin, saveSubjects, getUserProfile, updateUserProfile, verifyToken, changePassword, requestPasswordOTP, forgotPasswordOTP, forgotPasswordReset } from "../controllers/users.controller.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();


router.get("/", getUser);

router.post("/signup", signup);
router.post("/signin", signin);
router.get("/verify", authMiddleware, verifyToken);

router.post("/forgot-password/otp", forgotPasswordOTP);
router.post("/forgot-password/reset", forgotPasswordReset);

router.post("/:id/subjects", authMiddleware, saveSubjects);
router.get("/:id", authMiddleware, getUserProfile);
router.patch("/:id", authMiddleware, updateUserProfile);
router.post("/:id/password/otp", authMiddleware, requestPasswordOTP);
router.post("/:id/password", authMiddleware, changePassword);

export default router;