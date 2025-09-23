const express = require('express');
const Tag = require('../models/Tag');
const { auth } = require('../middleware/auth');
const router = express.Router();

// Get all tags
router.get('/',  async (req, res) => {
  try {
    const tags = await Tag.find().sort({ name: 1 });
    res.json(tags);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching tags' });
  }
});

// Create new tag
router.post('/', auth, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Tag name is required' });
    }
    
    // Check if tag already exists
    const existingTag = await Tag.findOne({ name });
    if (existingTag) {
      return res.status(400).json({ message: 'Tag already exists' });
    }
    
    const tag = new Tag({
      name,
      description: description || '',
      createdBy: req.user._id
    });
    
    await tag.save();
    res.status(201).json(tag);
  } catch (error) {
    res.status(500).json({ message: 'Server error creating tag' });
  }
});

// Update tag
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    const tag = await Tag.findByIdAndUpdate(
      req.params.id,
      { name, description },
      { new: true, runValidators: true }
    );
    
    if (!tag) {
      return res.status(404).json({ message: 'Tag not found' });
    }
    
    res.json(tag);
  } catch (error) {
    res.status(500).json({ message: 'Server error updating tag' });
  }
});

// Delete tag
router.delete('/:id', auth, async (req, res) => {
  try {
    const tag = await Tag.findByIdAndDelete(req.params.id);
    
    if (!tag) {
      return res.status(404).json({ message: 'Tag not found' });
    }
    
    res.json({ message: 'Tag deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting tag' });
  }
});

module.exports = router;
