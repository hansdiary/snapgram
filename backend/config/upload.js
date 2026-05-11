const multer = require('multer');

const imageFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;

  if (
    allowed.test(file.mimetype) &&
    allowed.test(file.originalname.toLowerCase())
  ) {
    return cb(null, true);
  }

  cb(new Error('Seules les images sont autorisées'));
};

const uploadPost = multer({
  storage: multer.memoryStorage(),
  fileFilter: imageFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

module.exports = { uploadPost };