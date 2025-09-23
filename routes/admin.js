// routes/admins.js
const express = require('express');
const User = require('../models/User');
const Blog = require('../models/Blog'); // assuming you have Blog model
const { auth } = require('../middleware/auth');

const router = express.Router();

// Only admin can create child admins
router.post('/', auth, async (req, res) => {
  try {
    // Only allow admin role to create child admins
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { firstName, lastName, email, password, agreeToTerms } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ message: 'Required fields missing' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const newUser = new User({
      firstName,
      lastName,
      email,
      password,
      agreeToTerms: !!agreeToTerms,
      role: 'childadmin'
    });

    await newUser.save();

    res.status(201).json({
      message: 'Child admin created',
      user: {
        id: newUser._id,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.createdAt
      }
    });
  } catch (error) {
    console.error('Create child admin error:', error);
    res.status(500).json({ message: 'Server error creating child admin' });
  }
});

// List child admins with their post counts
router.get('/', auth, async (req, res) => {
  try {
    // Only allow admin to view the admin list (if you want childadmins to see their own info you could change)
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const childAdmins = await User.find({ role: 'childadmin' }).select('-password');

    // For each child admin, fetch counts from Blog collection
    const results = await Promise.all(childAdmins.map(async (u) => {
      const total = await Blog.countDocuments({ createdBy: u._id });
      const published = await Blog.countDocuments({ createdBy: u._id, status: 'published' });
      const draft = await Blog.countDocuments({ createdBy: u._id, status: 'draft' });

      return {
        id: u._id,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        createdAt: u.createdAt,
        counts: { total, published, draft }
      };
    }));

    res.json(results);
  } catch (error) {
    console.error('Error fetching admins list:', error);
    res.status(500).json({ message: 'Server error fetching admins' });
  }
});

module.exports = router;
