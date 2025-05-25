const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const videoController = require('../controllers/videoController');
const auth = require('../middlewares/auth');

// Multer ayarları
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  },
});
const upload = multer({ storage });

// Video yükleme endpointi (korumalı)
router.post('/upload', auth, upload.single('video'), videoController.uploadVideo);

// Tüm videoları listeleme endpointi
router.get('/list', videoController.listVideos);

// Video oynatma (korumalı)
router.get('/stream/:filename', auth, videoController.streamVideo);

module.exports = router;