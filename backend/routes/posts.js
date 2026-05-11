const router = require('express').Router();
const Post = require('../models/Post');
const { protect } = require('../middleware/auth');
const { uploadPost } = require('../config/upload');

// GET /api/posts/stories — AVANT /:id pour éviter les conflits
router.get('/stories', protect, async (req, res) => {
  try {
    const following = [...req.user.following, req.user._id];
    const stories = await Post.find({
      author: { $in: following },
      isStory: true,
      expiresAt: { $gt: new Date() },
    })
    .sort({ createdAt: -1 })
    .populate('author', 'username avatar fullName');
    res.json(stories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/posts/feed
router.get('/feed', protect, async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const following = [...req.user.following, req.user._id];
    const posts = await Post.find({ author: { $in: following }, isStory: false })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('author', 'username avatar fullName')
      .populate('comments.user', 'username avatar');
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/posts/explore
router.get('/explore', protect, async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const posts = await Post.find({ isStory: false })
      .sort({ likes: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('author', 'username avatar');
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/posts
router.post('/', protect, uploadPost.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Image requise' });
    const { caption, location, tags, isStory } = req.body;
    const storyExpiry = isStory === 'true'
      ? new Date(Date.now() + 24 * 60 * 60 * 1000)
      : null;
    const post = await Post.create({
      author: req.user._id,
      imageUrl: `/uploads/posts/${req.file.filename}`,
      caption,
      location,
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
      isStory: isStory === 'true',
      expiresAt: storyExpiry,
    });
    const populated = await post.populate('author', 'username avatar fullName');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/posts/:id/like
router.post('/:id/like', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post introuvable' });
    const liked = post.likes.includes(req.user._id);
    if (liked) post.likes.pull(req.user._id);
    else post.likes.push(req.user._id);
    await post.save();
    res.json({ liked: !liked, likesCount: post.likes.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/posts/:id/comment
router.post('/:id/comment', protect, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) return res.status(400).json({ message: 'Commentaire vide' });
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post introuvable' });
    post.comments.push({ user: req.user._id, content });
    await post.save();
    const updated = await Post.findById(req.params.id)
      .populate('comments.user', 'username avatar');
    res.status(201).json(updated.comments.at(-1));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/posts/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post introuvable' });
    if (post.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Non autorisé' });
    }
    await post.deleteOne();
    res.json({ message: 'Post supprimé' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/posts/:id/comment/:commentId
router.put('/:id/comment/:commentId', protect, async (req, res) => {
  try {
    const { content } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post introuvable' });
    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Commentaire introuvable' });
    if (comment.user.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Non autorisé' });
    comment.content = content;
    await post.save();
    res.json(comment);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/posts/:id/comment/:commentId
router.delete('/:id/comment/:commentId', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post introuvable' });
    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Commentaire introuvable' });
    if (comment.user.toString() !== req.user._id.toString() && post.author.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Non autorisé' });
    comment.deleteOne();
    await post.save();
    res.json({ message: 'Commentaire supprimé' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;