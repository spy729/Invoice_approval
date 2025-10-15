import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'your-strong-secret-key';
const JWT_EXPIRES_IN = '30d'; // Increase token expiry to 30 days

function signToken(payload: object) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export async function registerUser(req: Request, res: Response) {
  try {
    const { name, email, password, role, companyId, companyName } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email and password are required' });
    }
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    // if companyName is provided, create a simple slug for companyId
    let resolvedCompanyId = companyId;
    if (!resolvedCompanyId && companyName) {
      resolvedCompanyId = String(companyName).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    }

    // Check if role is provided
    if (!role) {
      return res.status(400).json({ error: 'Role is required (admin or manager)' });
    }

    // Validate role
    if (!['admin', 'manager'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be either admin or manager' });
    }

    let assignedRole = role;

    // If trying to register as admin, check if company already has an admin
    if (role === 'admin' && resolvedCompanyId) {
      const existingAdmin = await User.findOne({ companyId: resolvedCompanyId, role: 'admin' });
      if (existingAdmin) {
        return res.status(403).json({ error: 'Company already has an admin. Please register as manager or contact your admin.' });
      }
    }

    try {
      // fallback to user id after save
      const user = new User({ name, email, password, role: assignedRole, companyId: resolvedCompanyId });
      await user.save();
      // if companyId was not set earlier, use user's _id as companyId
      if (!user.companyId) {
        user.companyId = String(user._id);
        await user.save();
      }

      const token = signToken({ id: user._id, email: user.email, role: user.role, name: user.name, companyId: user.companyId, companyName: companyName || null });
      
      // Set token in HTTP-only cookie
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });

      return res.status(201).json({
        success: true,
        token,
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      });
    } catch (dbError) {
      console.error('Database operation failed:', dbError);
      return res.status(500).json({ error: 'Failed to create user. Please try again.' });
    }
  } catch (err) {
    console.error('registerUser error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function loginUser(req: Request, res: Response) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

  const token = signToken({ id: user._id, email: user.email, role: user.role, name: user.name, companyId: user.companyId });
    
    // Set token in HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    return res.json({ 
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (err) {
    console.error('loginUser error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
