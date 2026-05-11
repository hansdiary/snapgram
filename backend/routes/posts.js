const router = require('express').Router();
const { Storage } = require('@google-cloud/storage');
const multer = require('multer');

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

const uploadPost = multer({
  storage: multer.memoryStorage(),
  fileFilter: imageFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

// =========================
// GCS UPLOAD FUNCTION
// =========================

const uploadToGCS = (file) => {
  return new Promise((resolve, reject) => {
    const filename = `${Date.now()}-${file.originalname}`;

    const blob = bucket.file(filename);

    const stream = blob.createWriteStream({
      resumable: false,
      metadata: {
        contentType: file.mimetype,
      },
    });

    stream.on('error', (err) => reject(err));

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
// GET STORIES
// =========================

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

// =========================
// GET FEED
// =========================

router.get('/feed', protect, async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;

    const following = [...req.user.following, req.user._id];

    const posts = await Post.find({
      author: { $in: following },
      isStory: false,
    })
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

// =========================
// GET EXPLORE
// =========================

router.get('/explore', protect, async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;

    const posts = await Post.find({
      isStory: false,
    })
      .sort({ likes: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate('author', 'username avatar');

    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// =========================
// CREATE POST
// =========================

router.post(
  '/',
  protect,
  uploadPost.single('image'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: 'Image requise',
        });
      }

      // Upload image to GCS
      const imageUrl = await uploadToGCS(req.file);

      const { caption, location, tags, isStory } = req.body;

      const storyExpiry =
        isStory === 'true'
          ? new Date(Date.now() + 24 * 60 * 60 * 1000)
          : null;

      const post = await Post.create({
        author: req.user._id,
        imageUrl,
        caption,
        location,
        tags: tags
          ? tags.split(',').map((t) => t.trim())
          : [],
        isStory: isStory === 'true',
        expiresAt: storyExpiry,
      });

      const populated = await post.populate(
        'author',
        'username avatar fullName'
      );

      res.status(201).json(populated);
    } catch (err) {
      res.status(500).json({
        message: err.message,
      });
    }
  }
);

// =========================
// LIKE POST
// =========================

router.post('/:id/like', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        message: 'Post introuvable',
      });
    }

    const liked = post.likes.includes(req.user._id);

    if (liked) {
      post.likes.pull(req.user._id);
    } else {
      post.likes.push(req.user._id);
    }

    await post.save();

    res.json({
      liked: !liked,
      likesCount: post.likes.length,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});

// =========================
// COMMENT POST
// =========================

router.post('/:id/comment', protect, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({
        message: 'Commentaire vide',
      });
    }

    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        message: 'Post introuvable',
      });
    }

    post.comments.push({
      user: req.user._id,
      content,
    });

    await post.save();

    const updated = await Post.findById(req.params.id)
      .populate('comments.user', 'username avatar');

    res.status(201).json(updated.comments.at(-1));
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});

// =========================
// DELETE POST
// =========================

router.delete('/:id', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({
        message: 'Post introuvable',
      });
    }

    if (
      post.author.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        message: 'Non autorisé',
      });
    }

    await post.deleteOne();

    res.json({
      message: 'Post supprimé',
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});

// =========================
// EDIT COMMENT
// =========================

router.put(
  '/:id/comment/:commentId',
  protect,
  async (req, res) => {
    try {
      const { content } = req.body;

      const post = await Post.findById(req.params.id);

      if (!post) {
        return res.status(404).json({
          message: 'Post introuvable',
        });
      }

      const comment = post.comments.id(
        req.params.commentId
      );

      if (!comment) {
        return res.status(404).json({
          message: 'Commentaire introuvable',
        });
      }

      if (
        comment.user.toString() !==
        req.user._id.toString()
      ) {
        return res.status(403).json({
          message: 'Non autorisé',
        });
      }

      comment.content = content;

      await post.save();

      res.json(comment);
    } catch (err) {
      res.status(500).json({
        message: err.message,
      });
    }
  }
);

// =========================
// DELETE COMMENT
// =========================

router.delete(
  '/:id/comment/:commentId',
  protect,
  async (req, res) => {
    try {
      const post = await Post.findById(req.params.id);

      if (!post) {
        return res.status(404).json({
          message: 'Post introuvable',
        });
      }

      const comment = post.comments.id(
        req.params.commentId
      );

      if (!comment) {
        return res.status(404).json({
          message: 'Commentaire introuvable',
        });
      }

      if (
        comment.user.toString() !==
          req.user._id.toString() &&
        post.author.toString() !==
          req.user._id.toString()
      ) {
        return res.status(403).json({
          message: 'Non autorisé',
        });
      }

      comment.deleteOne();

      await post.save();

      res.json({
        message: 'Commentaire supprimé',
      });
    } catch (err) {
      res.status(500).json({
        message: err.message,
      });
    }
  }
);

module.exports = router;