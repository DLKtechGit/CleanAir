const express = require('express');
const Blog = require('../models/Blog');
const Category = require('../models/Category');
const Tag = require('../models/Tag');
const { auth } = require('../middleware/auth');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Ensure this folder exists in your project root
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Images only (jpg, jpeg, png)!'));
    }
  }
});

// Get all blogs with filtering and pagination
router.post('/upload-image', auth, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded' });
    }
    const imagePath = `/uploads/${req.file.filename}`;
    res.status(200).json({ imageUrl: `http://192.168.1.77:5000${imagePath}` });
  } catch (error) {
    console.error('Error uploading image:', error);
    res.status(500).json({ message: 'Server error uploading image' });
  }
});

// Get all blogs with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    
    // Build filter object
    const filter = {};
    
    // Status filter
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    // Category filter
    if (req.query.category) {
      filter.category = req.query.category;
    }
    
    // Tag filter
    if (req.query.tag) {
      filter.tags = req.query.tag;
    }
    
    // Search filter
    if (req.query.search) {
      filter.$or = [
        { title: { $regex: req.query.search, $options: 'i' } },
        { content: { $regex: req.query.search, $options: 'i' } },
        { excerpt: { $regex: req.query.search, $options: 'i' } }
      ];
    }
    
    // Get blogs with populated category, tags, and createdBy
    const blogs = await Blog.find(filter)
      .populate('category', 'name')
      .populate('tags', 'name')
      .populate('createdBy', 'firstName lastName role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Get total count for pagination
    const total = await Blog.countDocuments(filter);
    
    res.json({
      blogs,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching blogs' });
  }
});

// Get single blog by ID
router.get('/:id', async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id)
      .populate('category', 'name')
      .populate('tags', 'name')
      .populate('createdBy', 'firstName lastName role');
    
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }
    
    res.json(blog);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching blog' });
  }
});

// Create new blog with image upload
router.post('/', auth, upload.array('images', 10), async (req, res) => {
  try {
    const { title, author, content, category, tags, featuredImage, status, images: imagesStr } = req.body;
    
    // Validate required fields
    if (!title || !author || !content || !category) {
      return res.status(400).json({ message: 'Title, author, content, and category are required' });
    }
    
    // Check if category exists
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(400).json({ message: 'Category does not exist' });
    }
    
    // Check if tags exist
    if (tags && tags.length > 0) {
      const parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
      const tagsExist = await Tag.find({ _id: { $in: parsedTags } });
      if (tagsExist.length !== parsedTags.length) {
        return res.status(400).json({ message: 'One or more tags do not exist' });
      }
    }
    
    // Handle images from JSON (editor uploads)
    let blogImages = [];
    if (imagesStr) {
      try {
        blogImages = JSON.parse(imagesStr);
      } catch (e) {
        console.error('Invalid images JSON');
      }
    }

    // Store image paths from file uploads (full URL)
    const imagePaths = req.files ? req.files.map(file => `http://192.168.1.77:5000/uploads/${file.filename}`) : [];
    
    // Create blog
    const blog = new Blog({
      title,
      author,
      content,
      category,
      tags: typeof tags === 'string' ? JSON.parse(tags) : tags || [],
      featuredImage: featuredImage || '',
      images: [...blogImages, ...imagePaths],
      status: status || 'draft',
      createdBy: req.user._id
    });
    
    // Set publishedAt if status is published
    if (status === 'published') {
      blog.publishedAt = new Date();
    }
    
    await blog.save();
    
    // Populate category, tags, and createdBy for response
    await blog.populate('category', 'name');
    await blog.populate('tags', 'name');
    await blog.populate('createdBy', 'firstName lastName role');
    
    res.status(201).json(blog);
  } catch (error) {
    console.error('Error creating blog:', error);
    res.status(500).json({ message: 'Server error creating blog' });
  }
});

// Update blog with image upload
router.put('/:id', auth, upload.array('images', 10), async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    let allowed = false;
    if (req.user.role === 'admin') {
      allowed = true;
    } else if (blog.createdBy.toString() === req.user._id.toString()) {
      const keys = Object.keys(req.body);
      if (keys.length === 1 && keys[0] === 'status') {
        allowed = true;
      }
    }

    if (!allowed) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { title, author, content, category, tags, featuredImage, status, images: imagesStr } = req.body;
    
    // Check if category exists
    if (category) {
      const categoryExists = await Category.findById(category);
      if (!categoryExists) {
        return res.status(400).json({ message: 'Category does not exist' });
      }
      blog.category = category;
    }
    
    // Check if tags exist
    if (tags) {
      const parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
      const tagsExist = await Tag.find({ _id: { $in: parsedTags } });
      if (tagsExist.length !== parsedTags.length) {
        return res.status(400).json({ message: 'One or more tags do not exist' });
      }
      blog.tags = parsedTags;
    }
    
    // Update fields
    if (title) blog.title = title;
    if (author) blog.author = author;
    if (content) blog.content = content;
    if (featuredImage !== undefined) blog.featuredImage = featuredImage;
    
    // Handle images from JSON (editor uploads, replaces the list)
    if (imagesStr) {
      try {
        const parsedImages = JSON.parse(imagesStr);
        blog.images = parsedImages;
      } catch (e) {
        console.error('Invalid images JSON');
      }
    }
    
    // Handle new image uploads from files (append)
    if (req.files && req.files.length > 0) {
      const newImagePaths = req.files.map(file => `http://192.168.1.77:5000/uploads/${file.filename}`);
      blog.images = [...blog.images, ...newImagePaths];
    }
    
    // Handle status change
    if (status && status !== blog.status) {
      blog.status = status;
      if (status === 'published' && !blog.publishedAt) {
        blog.publishedAt = new Date();
      }
    }
    
    await blog.save();
    
    // Populate category, tags, and createdBy for response
    await blog.populate('category', 'name');
    await blog.populate('tags', 'name');
    await blog.populate('createdBy', 'firstName lastName role');
    
    res.json(blog);
  } catch (error) {
    console.error('Error updating blog:', error);
    res.status(500).json({ message: 'Server error updating blog' });
  }
});

// Delete blog
router.delete('/:id', auth, async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    await Blog.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Blog deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting blog' });
  }
});

module.exports = router;