const router = require('express').Router();
const Post = require('../models/Post');
const { protect } = require('../middleware/auth');
const { uploadPost } = require('../config/upload');

// GET /api/posts/feed — fil d'actualité (following + soi-même)
router.get('/feed', protect, async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const following = [...req.user.following, req.user._id];
    const posts = await Post.find({ author: { $in: following } })
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

// GET /api/posts/explore — posts publics
router.get('/explore', protect, async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const posts = await Post.find()
      .sort({ likes: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('author', 'username avatar');
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/posts — créer un post
router.post('/', protect, uploadPost.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Image requise' });
    const { caption, location, tags } = req.body;
    const post = await Post.create({
      author: req.user._id,
      imageUrl: `/uploads/posts/${req.file.filename}`,
      caption,
      location,
      tags: tags ? tags.split(',').map(t => t.trim()) : [],
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
    if (liked) {
      post.likes.pull(req.user._id);
    } else {
      post.likes.push(req.user._id);
    }
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

module.exports = router;
