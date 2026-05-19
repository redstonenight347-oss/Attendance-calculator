import express from "express";
import dotenv from 'dotenv';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';

dotenv.config({quiet: true});

// Environment Startup Validation
const REQUIRED_ENV = ["DATABASE_URL", "JWT_SECRET"];
for (const envVar of REQUIRED_ENV) {
  if (!process.env[envVar]) {
    console.error(`CRITICAL STARTUP ERROR: Environment variable "${envVar}" is missing!`);
    process.exit(1);
  }
}

import userRoutes from "./routes/users.router.js";
import attendanceRoutes from "./routes/attendance.router.js";

const app = express();

// Security Middlewares
app.use(helmet({
  contentSecurityPolicy: false, // Turn off CSP so inline styles/scripts in public index/dashboard.html render without strict rules
  crossOriginEmbedderPolicy: false,
}));

app.use(express.json());
app.use(express.static("public"));

// Rate Limiters
const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 150, 
  message: { message: "Too many requests. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, 
  message: { message: "Too many sign-in attempts. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 5, 
  message: { message: "Too many accounts created from this IP. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, 
  message: { message: "Too many OTP requests. Please try again in 10 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Enforce specific limits on authentication/sensitive pathways
app.use("/users/signin", authLimiter);
app.use("/users/signup", signupLimiter);
app.use("/users/forgot-password/otp", otpLimiter);
app.use("/users/forgot-password/reset", otpLimiter);
app.use("/users/:id/password/otp", otpLimiter);

// General limiter on other API routes
app.use("/users", generalLimiter);
app.use("/:userID/attendance", generalLimiter);

app.use("/users", userRoutes);
app.use("/:userID/attendance", attendanceRoutes); 

export default app;