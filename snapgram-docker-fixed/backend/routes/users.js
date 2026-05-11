const router = require('express').Router();
const User = require('../models/User');
const Post = require('../models/Post');
const { protect } = require('../middleware/auth');
const { uploadAvatar } = require('../config/upload');

// GET /api/users/search?q=
router.get('/search', protect, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);
    const users = await User.find({
      $or: [
        { username: { $regex: q, $options: 'i' } },
        { fullName: { $regex: q, $options: 'i' } },
      ],
    }).limit(10).select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/users/:username
router.get('/:username', protect, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .populate('followers', 'username fullName avatar')
      .populate('following', 'username fullName avatar');
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });

    const posts = await Post.find({ author: user._id })
      .sort({ createdAt: -1 })
      .populate('author', 'username avatar');

    res.json({ user, posts });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/users/profile/update
router.put('/profile/update', protect, uploadAvatar.single('avatar'), async (req, res) => {
  try {
    const { fullName, bio, website } = req.body;
    const update = { fullName, bio, website };
    if (req.file) {
      update.avatar = `/uploads/avatars/${req.file.filename}`;
    }
    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/users/:id/follow
router.post('/:id/follow', protect, async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ message: 'Impossible de se suivre soi-même' });
    }
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: 'Utilisateur introuvable' });

    const isFollowing = target.followers.includes(req.user._id);
    if (isFollowing) {
      await User.findByIdAndUpdate(req.params.id, { $pull: { followers: req.user._id } });
      await User.findByIdAndUpdate(req.user._id, { $pull: { following: req.params.id } });
      res.json({ followed: false });
    } else {
      await User.findByIdAndUpdate(req.params.id, { $addToSet: { followers: req.user._id } });
      await User.findByIdAndUpdate(req.user._id, { $addToSet: { following: req.params.id } });
      res.json({ followed: true });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
