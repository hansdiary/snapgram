const { Storage } = require('@google-cloud/storage');

const storage = new Storage();

const bucket = storage.bucket('snapgram-uploads');

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

    stream.on('error', reject);

    stream.on('finish', async () => {
      await blob.makePublic();

      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;

      resolve(publicUrl);
    });

    stream.end(file.buffer);
  });
};

module.exports = { uploadToGCS };