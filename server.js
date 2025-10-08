// server.js (modified - added user routes and modifications to existing routes)
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Blog = require('./models/Blog')
const { auth, JWT_SECRET } = require('./middleware/auth');
const blogRoutes = require('./routes/blogs');
const categoryRoutes = require('./routes/categories');
const contactRoutes = require('./routes/contact');
const productRoutes = require('./routes/productCatalogue')
const tagRoutes = require('./routes/tags');
const path = require('path');

const app = express();
// const PORT = 5000;
// const IP = '192.168.1.77';

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
mongoose.connect('mongodb+srv://prithuapp_db_user:eETUIeouSRU7Xipu@cluster0.x0vkq8e.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/blogs', blogRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api', contactRoutes);
app.use('/api', productRoutes);

app.get('/', (req, res) => {
  res.send('Hello root node');
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// Signup endpoint (public, creates childadmin by default)
app.post('/api/signup', async (req, res) => {
  try {
    const { firstName, lastName, username, email, password, confirmPassword, agreeToTerms } = req.body;

    // Validation
    if (!firstName || !lastName || !username || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    if (!agreeToTerms) {
      return res.status(400).json({ message: 'You must agree to the terms and conditions' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email or username' });
    }

    // Create new user
    const user = new User({
      firstName,
      lastName,
      username,
      email,
      password,
      agreeToTerms,
      role: 'publisher'
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Signin endpoint
app.post('/api/signin', async (req, res) => {
  try {
    const { loginId, password, rememberMe } = req.body;

    // Validation
    if (!loginId || !password) {
      return res.status(400).json({ message: 'Username/email and password are required' });
    }

    // Find user
    const user = await User.findOne({ $or: [{ email: loginId }, { username: loginId }] });
    if (!user) {
      return res.status(400).json({ message: 'Invalid username/email or password' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid username/email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: rememberMe ? '30d' : '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Signin error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Protected route example
app.get('/api/user', auth, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user._id,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        email: req.user.email,
        role: req.user.role
      }
    });
  } catch (error) {
    console.error('User fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current user profile
app.get('/api/user/profile', auth, async (req, res) => {
  try {
    // The auth middleware already sets req.user
    res.json({
      user: {
        id: req.user._id,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        email: req.user.email,
        createdAt: req.user.createdAt,
        role: req.user.role
      }
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'Server error fetching user profile' });
  }
});

// New User Routes for Admin Management (protected)
const userRoutes = express.Router();

// Get all childadmins with counts (only for admins)
userRoutes.get('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const users = await User.find({ role: { $in: ['publisher', 'editor'] } }).select('-password -agreeToTerms');

    const usersWithCounts = await Promise.all(users.map(async (user) => {
      const publishedCount = await Blog.countDocuments({ createdBy: user._id, status: 'published' });
      const draftCount = await Blog.countDocuments({ createdBy: user._id, status: 'draft' });
      return {
        ...user.toObject(),
        publishedCount,
        draftCount
      };
    }));

    res.json(usersWithCounts);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error fetching users' });
  }
});

// Create new childadmin (only for admins)
userRoutes.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { firstName, lastName, username, email, password, confirmPassword, role } = req.body;

    // Validation
    if (!firstName || !lastName || !username || !password || !confirmPassword || !role) {
      return res.status(400).json({ message: 'First name, last name, username, password, confirm password, and role are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    if (!['publisher', 'editor'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email or username' });
    }

    // Create new childadmin
    const user = new User({
      firstName,
      lastName,
      username,
      email: email || undefined, // Email is optional
      password,
      agreeToTerms: true,  // Auto-agree for admin-created
      role
    });

    await user.save();

    res.status(201).json({
      message: 'Child admin created successfully',
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Server error creating user' });
  }
});

app.use('/api/users', userRoutes);

// Start server
const PORT = process.env.PORT || 5000; // use Render's port or fallback
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});