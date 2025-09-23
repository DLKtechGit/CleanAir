// routes/blogs.js (modified - added populate createdBy)
const express = require('express');
const Blog = require('../models/Blog');
const Category = require('../models/Category');
const Tag = require('../models/Tag');
const { auth } = require('../middleware/auth');
const router = express.Router();

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
      .populate('createdBy', 'firstName lastName')
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
      .populate('createdBy', 'firstName lastName');
    
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }
    
    res.json(blog);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching blog' });
  }
});

// Create new blog
router.post('/', auth, async (req, res) => {
  try {
    const { title, author, content, category, tags, featuredImage, status } = req.body;
    
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
      const tagsExist = await Tag.find({ _id: { $in: tags } });
      if (tagsExist.length !== tags.length) {
        return res.status(400).json({ message: 'One or more tags do not exist' });
      }
    }
    
    // Create blog
    const blog = new Blog({
      title,
      author,
      content,
      category,
      tags: tags || [],
      featuredImage: featuredImage || '',
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
    await blog.populate('createdBy', 'firstName lastName');
    
    res.status(201).json(blog);
  } catch (error) {
    res.status(500).json({ message: 'Server error creating blog' });
  }
});

// Update blog
router.put('/:id', auth, async (req, res) => {
  try {
    const { title, author, content, category, tags, featuredImage, status } = req.body;
    
    // Find blog
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }
    
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
      const tagsExist = await Tag.find({ _id: { $in: tags } });
      if (tagsExist.length !== tags.length) {
        return res.status(400).json({ message: 'One or more tags do not exist' });
      }
      blog.tags = tags;
    }
    
    // Update fields
    if (title) blog.title = title;
    if (author) blog.author = author;
    if (content) blog.content = content;
    if (featuredImage !== undefined) blog.featuredImage = featuredImage;
    
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
    await blog.populate('createdBy', 'firstName lastName');
    
    res.json(blog);
  } catch (error) {
    res.status(500).json({ message: 'Server error updating blog' });
  }
});

// Delete blog
router.delete('/:id', auth, async (req, res) => {
  try {
    const blog = await Blog.findByIdAndDelete(req.params.id);
    
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }
    
    res.json({ message: 'Blog deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting blog' });
  }
});

module.exports = router;