const multer = require('multer');
const path = require('path');
const fs = require('fs');

const createStorage = (dest) => {
  const dir = path.join(__dirname, '..', 'uploads', dest);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, dir),
    filename: (req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `${unique}${path.extname(file.originalname)}`);
    },
  });
};

const imageFilter = (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  if (allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype)) {
    return cb(null, true);
  }
  cb(new Error('Seules les images sont autorisées'));
};

const uploadPost   = multer({ storage: createStorage('posts'),   fileFilter: imageFilter, limits: { fileSize: 10 * 1024 * 1024 } });
const uploadAvatar = multer({ storage: createStorage('avatars'), fileFilter: imageFilter, limits: { fileSize: 5  * 1024 * 1024 } });

module.exports = { uploadPost, uploadAvatar };
