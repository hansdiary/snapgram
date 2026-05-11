const router = require('express').Router();
const { Storage } = require('@google-cloud/storage');
const multer = require('multer');

const User = require('../models/User');
const Post = require('../models/Post');

const { protect } = require('../middleware/auth');

// =========================
// GOOGLE CLOUD STORAGE
// =========================

const storage = new Storage();

const bucket = storage.bucket('snapgram-uploads');

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
// GCS UPLOAD FUNCTION
// =========================

const uploadToGCS = (file) => {
  return new Promise((resolve, reject) => {
    const filename = `avatars/${Date.now()}-${file.originalname}`;

    const blob = bucket.file(filename);

    const stream = blob.createWriteStream({
      resumable: false,
      metadata: {
        contentType: file.mimetype,
      },
    });

    stream.on('error', reject);

    stream.on('finish', async () => {
      try {
        await blob.makePublic();

        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;

        resolve(publicUrl);
      } catch (err) {
        reject(err);
      }
    });

    stream.end(file.buffer);
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
      .select(
        'username fullName avatar followers'
      );

    const withCount = users.map((u) => ({
      ...u.toJSON(),
      followersCount:
        u.followers?.length || 0,
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
      .populate(
        'followers',
        'username fullName avatar'
      )
      .populate(
        'following',
        'username fullName avatar'
      );

    if (!user) {
      return res.status(404).json({
        message: 'Utilisateur introuvable',
      });
    }

    const posts = await Post.find({
      author: user._id,
    })
      .sort({ createdAt: -1 })
      .populate(
        'author',
        'username avatar'
      );

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
      const {
        fullName,
        bio,
        website,
      } = req.body;

      const update = {
        fullName,
        bio,
        website,
      };

      // Upload avatar to GCS
      if (req.file) {
        const avatarUrl =
          await uploadToGCS(req.file);

        update.avatar = avatarUrl;
      }

      const user =
        await User.findByIdAndUpdate(
          req.user._id,
          update,
          { new: true }
        );

      res.json({ user });
    } catch (err) {
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
    if (
      req.params.id ===
      req.user._id.toString()
    ) {
      return res.status(400).json({
        message:
          'Impossible de se suivre soi-même',
      });
    }

    const target = await User.findById(
      req.params.id
    );

    if (!target) {
      return res.status(404).json({
        message:
          'Utilisateur introuvable',
      });
    }

    const isFollowing =
      target.followers.includes(
        req.user._id
      );

    if (isFollowing) {
      await User.findByIdAndUpdate(
        req.params.id,
        {
          $pull: {
            followers: req.user._id,
          },
        }
      );

      await User.findByIdAndUpdate(
        req.user._id,
        {
          $pull: {
            following: req.params.id,
          },
        }
      );

      res.json({
        followed: false,
      });
    } else {
      await User.findByIdAndUpdate(
        req.params.id,
        {
          $addToSet: {
            followers: req.user._id,
          },
        }
      );

      await User.findByIdAndUpdate(
        req.user._id,
        {
          $addToSet: {
            following: req.params.id,
          },
        }
      );

      res.json({
        followed: true,
      });
    }
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});

module.exports = router;