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

  const { fullName, email, password } = req.body;

  if (!fullName || !email || !password) {
    return res.status(400).json({ success: false, error: { message: 'All fields are required.' } });
  }

  try {
    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');

    const emailLower = email.toLowerCase();
    const existingUser = await usersCollection.findOne({ email: emailLower });

    if (existingUser) {
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
      createdAt: new Date()
    };

    await usersCollection.insertOne(newUser);

    const tokenSecret = process.env.JWT_SECRET || 'fallback_secret_key';
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
    console.error('[Auth Register Serverless] Error:', err);
    return res.status(500).json({ success: false, error: { message: 'Internal server error during registration.' } });
  }
}
