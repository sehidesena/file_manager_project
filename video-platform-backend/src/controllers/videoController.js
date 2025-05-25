const Video = require('../models/Video');
const fs = require('fs');
const path = require('path');

exports.uploadVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Video dosyası gerekli.' });
    }
    const { title } = req.body;
    const video = new Video({
      title,
      filename: req.file.filename,
      url: `/uploads/${req.file.filename}`,
      // uploadedBy: req.userId (auth eklenirse)
    });
    await video.save();
    res.status(201).json({ message: 'Video yüklendi!', video });
  } catch (err) {
    res.status(500).json({ error: 'Video yüklenirken hata oluştu.' });
  }
};

exports.listVideos = async (req, res) => {
  try {
    const videos = await Video.find().sort({ createdAt: -1 });
    res.json(videos);
  } catch (err) {
    res.status(500).json({ error: 'Videolar listelenirken hata oluştu.' });
  }
};

exports.streamVideo = (req, res) => {
  const { filename } = req.params;
  const videoPath = path.join(__dirname, '../../uploads', filename);

  fs.stat(videoPath, (err, stats) => {
    if (err || !stats.isFile()) {
      return res.status(404).json({ error: 'Video bulunamadı.' });
    }

    const range = req.headers.range;
    if (!range) {
      return res.status(416).send('Range header gerekli');
    }

    const videoSize = stats.size;
    const CHUNK_SIZE = 10 ** 6; // 1MB
    const start = Number(range.replace(/\D/g, ''));
    const end = Math.min(start + CHUNK_SIZE, videoSize - 1);

    const contentLength = end - start + 1;
    const headers = {
      'Content-Range': `bytes ${start}-${end}/${videoSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': contentLength,
      'Content-Type': 'video/mp4',
    };

    res.writeHead(206, headers);
    const stream = fs.createReadStream(videoPath, { start, end });
    stream.pipe(res);
  });
};