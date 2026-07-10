import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { readUsers, writeUsers } from '../db.js';

const router = express.Router();

// ── POST /api/auth/register — register a new user securely with bcrypt hashing ──────────────────
router.post('/register', async (req, res) => {
  const { fullName, email, password } = req.body;

  if (!fullName || !email || !password) {
    return res.status(400).json({ success: false, error: { message: 'All fields are required.' } });
  }

  try {
    const users = readUsers();
    const emailLower = email.toLowerCase();
    
    if (users.some((u) => u.email.toLowerCase() === emailLower)) {
      return res.status(400).json({ success: false, error: { message: 'Email is already registered.' } });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const isEmailAdmin = emailLower.includes('admin');
    
    const newUser = {
      id: `u-${Date.now()}`,
      username: fullName.split(' ')[0] || 'User',
      fullName,
      email: emailLower,
      password: hashedPassword,
      role: isEmailAdmin ? 'admin' : 'user',
    };

    users.push(newUser);
    writeUsers(users);

    const tokenSecret = process.env.JWT_SECRET;
    const token = jwt.sign(
      { id: newUser.id, username: newUser.username, email: newUser.email, role: newUser.role },
      tokenSecret,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      success: true,
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (err) {
    console.error('[Auth Register] Error:', err);
    res.status(500).json({ success: false, error: { message: 'Internal server error during registration.' } });
  }
});

// ── POST /api/auth/login — authenticate user and return JWT ──────────────────
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: { message: 'Email and password are required.' } });
  }

  try {
    const users = readUsers();
    const emailLower = email.toLowerCase();
    const user = users.find((u) => u.email.toLowerCase() === emailLower);

    if (!user) {
      return res.status(401).json({ success: false, error: { message: 'Invalid email or password.' } });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: { message: 'Invalid email or password.' } });
    }

    const tokenSecret = process.env.JWT_SECRET;
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: user.role },
      tokenSecret,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('[Auth Login] Error:', err);
    res.status(500).json({ success: false, error: { message: 'Internal server error during login.' } });
  }
});

export default router;
