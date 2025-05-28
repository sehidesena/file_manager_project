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
      uploadedBy: req.userId // Artık yükleyen kullanıcıyı kaydediyoruz
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

exports.deleteVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({ error: 'Video bulunamadı.' });
    }
    // Sadece yükleyen kullanıcı silebilir
    if (video.uploadedBy && video.uploadedBy.toString() !== req.userId) {
      return res.status(403).json({ error: 'Bu videoyu silme yetkiniz yok.' });
    }
    // Dosyayı uploads klasöründen sil
    const filePath = path.join(__dirname, '../../uploads', video.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    await video.deleteOne();
    res.json({ message: 'Video silindi.' });
  } catch (err) {
    res.status(500).json({ error: 'Video silinirken hata oluştu.' });
  }
};

exports.listUserVideos = async (req, res) => {
  try {
    const videos = await Video.find({ uploadedBy: req.userId }).sort({ createdAt: -1 });
    res.json(videos);
  } catch (err) {
    res.status(500).json({ error: 'Kullanıcının videoları listelenirken hata oluştu.' });
  }
};

exports.updateVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({ error: 'Video bulunamadı.' });
    }
    // Sadece yükleyen kullanıcı güncelleyebilir
    if (video.uploadedBy && video.uploadedBy.toString() !== req.userId) {
      return res.status(403).json({ error: 'Bu videoyu güncelleme yetkiniz yok.' });
    }
    // Başlık güncelle
    if (title) {
      video.title = title;
    }
    // Dosya güncelle (yeni dosya yüklendiyse)
    if (req.file) {
      const oldFilePath = path.join(__dirname, '../../uploads', video.filename);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
      video.filename = req.file.filename;
      video.url = `/uploads/${req.file.filename}`;
    }
    await video.save();
    res.json({ message: 'Video güncellendi.', video });
  } catch (err) {
    res.status(500).json({ error: 'Video güncellenirken hata oluştu.' });
  }
};