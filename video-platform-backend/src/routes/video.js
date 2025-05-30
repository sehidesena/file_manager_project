const express = require('express');
const router = express.Router();
const multer = require('multer');
const videoController = require('../controllers/videoController');
const auth = require('../middlewares/auth');

// Multer ayarları (bellek üzerinde tut)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Video yükleme endpointi (korumalı)
router.post('/upload', auth, upload.single('video'), videoController.uploadVideo);

// Tüm videoları listeleme endpointi
router.get('/list', videoController.listVideos);

// Kullanıcıya özel video listesi (korumalı)
router.get('/my-videos', auth, videoController.listUserVideos);

// Video oynatma (korumalı)
router.get('/stream/:id', auth, videoController.getSignedVideoUrl);

// Video silme endpointi (korumalı)
router.delete('/delete/:id', auth, videoController.deleteVideo);

// Video güncelleme endpointi (korumalı)
router.put('/update/:id', auth, upload.single('video'), videoController.updateVideo);

module.exports = router;