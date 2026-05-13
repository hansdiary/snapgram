const router = require('express').Router();
const multer = require('multer');
const cloudinary = require('../config/cloudinary'); // ✅ Cloudinary comme dans posts.js

const User = require('../models/User');
const Post = require('../models/Post');

const { protect } = require('../middleware/auth');

// =========================
// MULTER CONFIG
// =========================

const imageFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;

  const isValid =
    allowed.test(file.mimetype) &&
    allowed.test(file.originalname.toLowerCase());

  if (isValid) {
    return cb(null, true);
  }

  cb(new Error('Seules les images sont autorisées'));
};

const uploadAvatar = multer({
  storage: multer.memoryStorage(),
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

// =========================
// CLOUDINARY UPLOAD FUNCTION
// =========================

const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: 'snapgram-avatars', // ✅ dossier dédié aux avatars
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    ).end(fileBuffer);
  });
};

// =========================
// SEARCH USERS
// =========================

router.get('/search', protect, async (req, res) => {
  try {
    const { q } = req.query;

    if (!q) {
      return res.json([]);
    }

    const users = await User.find({
      $or: [
        {
          username: {
            $regex: q,
            $options: 'i',
          },
        },
        {
          fullName: {
            $regex: q,
            $options: 'i',
          },
        },
      ],
    })
      .limit(10)
      .select('-password');

    res.json(users);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});

// =========================
// USER SUGGESTIONS
// =========================

router.get('/suggestions', protect, async (req, res) => {
  try {
    const me = await User.findById(req.user._id);

    const excluded = [
      ...(me.following || []),
      req.user._id,
    ];

    const users = await User.find({
      _id: { $nin: excluded },
    })
      .limit(8)
      .select('username fullName avatar followers');

    const withCount = users.map((u) => ({
      ...u.toJSON(),
      followersCount: u.followers?.length || 0,
    }));

    res.json(withCount);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});

// =========================
// GET USER PROFILE
// =========================

router.get('/:username', protect, async (req, res) => {
  try {
    const user = await User.findOne({
      username: req.params.username,
    })
      .populate('followers', 'username fullName avatar')
      .populate('following', 'username fullName avatar');

    if (!user) {
      return res.status(404).json({
        message: 'Utilisateur introuvable',
      });
    }

    const posts = await Post.find({
      author: user._id,
    })
      .sort({ createdAt: -1 })
      .populate('author', 'username avatar');

    res.json({
      user,
      posts,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});

// =========================
// UPDATE PROFILE
// =========================

router.put(
  '/profile/update',
  protect,
  uploadAvatar.single('avatar'),
  async (req, res) => {
    try {
      const { fullName, bio, website } = req.body;

      const update = { fullName, bio, website };

      // ✅ Upload avatar sur Cloudinary
      if (req.file) {
        const avatarUrl = await uploadToCloudinary(req.file.buffer);
        update.avatar = avatarUrl;
      }

      const user = await User.findByIdAndUpdate(
        req.user._id,
        update,
        { new: true }
      );

      res.json({ user });
    } catch (err) {
      console.error('ERREUR UPDATE PROFILE:', err);
      res.status(500).json({
        message: err.message,
      });
    }
  }
);

// =========================
// FOLLOW / UNFOLLOW
// =========================

router.post('/:id/follow', protect, async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({
        message: 'Impossible de se suivre soi-même',
      });
    }

    const target = await User.findById(req.params.id);

    if (!target) {
      return res.status(404).json({
        message: 'Utilisateur introuvable',
      });
    }

    const isFollowing = target.followers.includes(req.user._id);

    if (isFollowing) {
      await User.findByIdAndUpdate(req.params.id, {
        $pull: { followers: req.user._id },
      });

      await User.findByIdAndUpdate(req.user._id, {
        $pull: { following: req.params.id },
      });

      res.json({ followed: false });
    } else {
      await User.findByIdAndUpdate(req.params.id, {
        $addToSet: { followers: req.user._id },
      });

      await User.findByIdAndUpdate(req.user._id, {
        $addToSet: { following: req.params.id },
      });

      res.json({ followed: true });
    }
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});

module.exports = router;