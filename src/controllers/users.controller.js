import { getUserByName, createUserService, getUserByEmail, saveSubjectsService, getUserById, updateUser, updateUserPasswordService } from "../services/users.services.js";
import { clearUserCache } from "../services/attendance.services.js";
import { sendEmailChangeNotification, sendPasswordChangeEmail, sendPasswordOTPEmail } from "../services/email.services.js";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';


export async function getUser(req, res){

  try {
    const name = req.query.name;

    if(!name || name.trim() === "") {
      return res.status(400).json({ message: "*name required"});
    }

    console.log("Name: " + name);
    const user = await getUserByName(name);

    if(!user || user.length === 0){
      return res.status(500).json({ message: "failed to get user details" });   
    }

    
    console.log(user[0])
    res.json(user[0])  
  }
  catch (err) {
    console.log(err);
    res.status(500).json({ message: "failed to get user details" });
  }

};

export async function signup(req, res) {
  try {
    const { name, email, password } = req.body;

    if(!name || name.trim() === "") {
      return res.status(400).json({ message: "*name required"});
    }
    if(!email || email.trim() === "") {
      return res.status(400).json({ message: "*email required"}); 
    }
    if(!password || password.trim() === "") {
      return res.status(400).json({ message: "*password required"}); 
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "*valid email required"});
    }

    const existingUsers = await getUserByEmail(email);
    if (existingUsers && existingUsers.length > 0) {
      return res.status(400).json({ message: "User with this email already exists" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = await createUserService(name, email, hashedPassword);

    const token = jwt.sign(
      { id: newUser.id, name: newUser.name },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({ 
      message: "User signed up successfully", 
      userId: newUser.id,
      token: token
    });
  }
  catch (err) {
    console.log(err);
    res.status(500).json({ message: "User couldn't sign up" });
  }
}

export async function signin(req, res) {
  try {
    const { email, password } = req.body;

    if(!email || email.trim() === "") {
      return res.status(400).json({ message: "*email required"}); 
    }
    if(!password || password.trim() === "") {
      return res.status(400).json({ message: "*password required"}); 
    }

    const users = await getUserByEmail(email);
    if (!users || users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = users[0];
    let isMatch = false;

    // Try bcrypt comparison first
    try {
      isMatch = await bcrypt.compare(password, user.password);
    } catch (e) {
      // If comparison fails due to invalid hash format, it might be plaintext
      isMatch = false;
    }

    // Fallback for existing plaintext passwords
    if (!isMatch && password === user.password) {
      isMatch = true;
      // Auto-migrate to hashed password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      await updateUserPasswordService(user.id, hashedPassword);
      console.log(`Migrated user ${user.email} to hashed password`);
    }
    
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password" });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({ 
      message: "Signed in successfully", 
      userId: user.id, 
      name: user.name,
      token: token
    });
  }
  catch (err) {
    console.log(err);
    res.status(500).json({ message: "Sign in failed" });
  }
}


export async function verifyToken(req, res) {
  // req.user is populated by authMiddleware
  res.json({ 
    valid: true, 
    user: req.user 
  });
}

export async function saveSubjects(req, res) {
  try {
    const { id } = req.params;
    const { subjects } = req.body;

    if (!subjects || !Array.isArray(subjects)) {
      return res.status(400).json({ message: "Subjects array is required" });
    }

    await saveSubjectsService(id, subjects);

    res.json({ message: "Subjects saved successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to save subjects" });
  }
}

export async function getUserProfile(req, res) {
  try {
    const { id } = req.params;
    const users = await getUserById(id);
    
    if (!users || users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.json(users[0]);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to get user profile" });
  }
}

export async function updateUserProfile(req, res) {
  try {
    const { id } = req.params;
    const { name, email, startMarker } = req.body;
    
    if (
      (!name || name.trim() === "") && 
      (!email || email.trim() === "") && 
      (startMarker === undefined)
    ) {
      return res.status(400).json({ message: "Name, email, or start marker is required" });
    }
    
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Valid email required" });
      }
      
      const existingUsers = await getUserByEmail(email);
      if (existingUsers && existingUsers.length > 0 && existingUsers[0].id !== parseInt(id)) {
        return res.status(400).json({ message: "User with this email already exists" });
      }
    }
    
    const updatedData = {};
    if (name) updatedData.name = name;
    if (email) updatedData.email = email;
    if (startMarker !== undefined) updatedData.startMarker = startMarker;

    const updatedUsers = await updateUser(id, updatedData);
    
    if (!updatedUsers || updatedUsers.length === 0) {
      return res.status(500).json({ message: "Failed to update user profile" });
    }
    
    clearUserCache(id);

    // Send email notification if email was updated
    if (email) {
      // Background async call (don't wait for it)
      sendEmailChangeNotification(email, updatedUsers[0].name).catch(e => console.error("Email error:", e));
    }

    res.json({ message: "Profile updated successfully", user: updatedUsers[0] });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to update user profile" });
  }
}

// In-memory store for OTPs (for production, use Redis or DB)
const otpStore = new Map();

export async function requestPasswordOTP(req, res) {
  try {
    const { id } = req.params;
    
    const users = await getUserById(id);
    if (!users || users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const user = users[0];
    if (!user.email) {
      return res.status(400).json({ message: "No email associated with this account" });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP with 10 minute expiration
    otpStore.set(id, {
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000
    });

    // Send email
    const emailSent = await sendPasswordOTPEmail(user.email, user.name, otp);
    
    if (!emailSent) {
      return res.status(500).json({ message: "Failed to send OTP email" });
    }
    
    res.json({ message: "OTP sent successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to request OTP" });
  }
}

export async function changePassword(req, res) {
  try {
    const { id } = req.params;
    const { otp, newPassword } = req.body;
    
    if (!otp || !newPassword) {
      return res.status(400).json({ message: "OTP and new password are required" });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    // Verify OTP
    const storedData = otpStore.get(id);
    if (!storedData) {
      return res.status(400).json({ message: "No OTP requested or OTP expired" });
    }
    
    if (Date.now() > storedData.expiresAt) {
      otpStore.delete(id);
      return res.status(400).json({ message: "OTP has expired" });
    }
    
    if (storedData.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }
    
    // OTP is valid, clear it
    otpStore.delete(id);
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update password in DB
    await updateUserPasswordService(id, hashedPassword);
    
    // Send confirmation email
    const users = await getUserById(id);
    if (users && users.length > 0 && users[0].email) {
      sendPasswordChangeEmail(users[0].email, users[0].name).catch(e => console.error("Email error:", e));
    }
    
    res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Failed to process password change" });
  }
}

// In-memory store for Forgot Password OTPs
const forgotPasswordOtpStore = new Map();

export async function forgotPasswordOTP(req, res) {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }
    
    const users = await getUserByEmail(email);
    if (!users || users.length === 0) {
      return res.status(404).json({ message: "User with this email not found" });
    }
    
    const user = users[0];
    
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP under the email key
    forgotPasswordOtpStore.set(email, {
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000
    });
    
    // Send email
    const emailSent = await sendPasswordOTPEmail(email, user.name, otp);
    
    if (!emailSent) {
      return res.status(500).json({ message: "Failed to send OTP email" });
    }
    
    res.json({ message: "OTP sent successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to request OTP" });
  }
}

export async function forgotPasswordReset(req, res) {
  try {
    const { email, otp, newPassword } = req.body;
    
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "Email, OTP, and new password are required" });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }
    
    // Verify OTP
    const storedData = forgotPasswordOtpStore.get(email);
    if (!storedData) {
      return res.status(400).json({ message: "No OTP requested or OTP expired" });
    }
    
    if (Date.now() > storedData.expiresAt) {
      forgotPasswordOtpStore.delete(email);
      return res.status(400).json({ message: "OTP has expired" });
    }
    
    if (storedData.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }
    
    // OTP is valid, clear it
    forgotPasswordOtpStore.delete(email);
    
    // Find user to get ID
    const users = await getUserByEmail(email);
    if (!users || users.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    const user = users[0];
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update password
    await updateUserPasswordService(user.id, hashedPassword);
    
    // Send confirmation email
    sendPasswordChangeEmail(user.email, user.name).catch(e => console.error("Email error:", e));
    
    res.json({ message: "Password reset successfully. You can now log in." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to reset password" });
  }
}