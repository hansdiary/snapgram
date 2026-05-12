const router = require('express').Router();
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const Post = require('../models/Post');
const { protect } = require('../middleware/auth');


const uploadToCloudinary = (fileBuffer) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: 'snapgram-posts',
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    ).end(fileBuffer);
  });
};


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
        return res.status(400).json({ message: 'Image requise' });
      }

      const imageUrl = await uploadToCloudinary(req.file.buffer);

      const post = await Post.create({
        author: req.user._id,
        imageUrl,
        caption: req.body.caption,
        location: req.body.location,
        tags: req.body.tags ? req.body.tags.split(',') : [],
        isStory: req.body.isStory === 'true',
        expiresAt:
          req.body.isStory === 'true'
            ? new Date(Date.now() + 24 * 60 * 60 * 1000)
            : null,
      });

      res.status(201).json(post);
    } catch (err) {
      console.error('POST ERROR:', err);
      res.status(500).json({ message: err.message });
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