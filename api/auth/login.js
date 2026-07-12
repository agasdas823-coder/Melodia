import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '../_utils/mongodb.js';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: { message: 'Method Not Allowed' } });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: { message: 'Email and password are required.' } });
  }

  try {
    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');

    const emailLower = email.toLowerCase();
    const user = await usersCollection.findOne({ email: emailLower });

    if (!user) {
      return res.status(401).json({ success: false, error: { message: 'Invalid email or password.' } });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: { message: 'Invalid email or password.' } });
    }

    const tokenSecret = process.env.JWT_SECRET || 'fallback_secret_key';
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
    console.error('[Auth Login Serverless] Error:', err);
    return res.status(500).json({ success: false, error: { message: 'Internal server error during login.' } });
  }
}
