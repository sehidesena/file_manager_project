const AWS = require('aws-sdk');
const Video = require('../models/Video');
const s3 = require('../services/s3Service');
const path = require('path');

// MediaConvert client'ı başlat
const mediaConvert = new AWS.MediaConvert({
  endpoint: process.env.MEDIACONVERT_ENDPOINT, // .env'ye eklemelisin
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

exports.uploadVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Video dosyası gerekli.' });
    }
    const { title, format } = req.body;
    if (format && !['mp4', 'mov'].includes(format.toLowerCase())) {
      return res.status(400).json({ error: 'Sadece MP4 ve MOV formatları destekleniyor.' });
    }
    // 1. Dosyayı S3 input klasörüne yükle
    const inputKey = 'input/' + Date.now() + '-' + req.file.originalname;
    await s3.upload({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: inputKey,
      Body: req.file.buffer,
      ContentType: req.file.mimetype
    }).promise();
    // 2. MediaConvert job'ı başlat (format parametresine göre ve sıkıştırma ayarları)
    let container, videoCodecSettings;
    switch ((format || '').toLowerCase()) {
      case 'mov':
        container = 'MOV';
        videoCodecSettings = {
          Codec: 'H_264',
          H264Settings: {
            RateControlMode: 'QVBR',
            MaxBitrate: 2000000, // 2 Mbps
            QvbrSettings: { QvbrQualityLevel: 7 },
            // Sıkıştırma için çözünürlük ayarı
          }
        };
        break;
      default:
        container = 'MP4';
        videoCodecSettings = {
          Codec: 'H_264',
          H264Settings: {
            RateControlMode: 'QVBR',
            MaxBitrate: 2000000, // 2 Mbps
            QvbrSettings: { QvbrQualityLevel: 7 },
          }
        };
    }
    const params = {
      Role: process.env.MEDIACONVERT_ROLE_ARN,
      Settings: {
        OutputGroups: [
          {
            Name: 'File Group',
            OutputGroupSettings: {
              Type: 'FILE_GROUP_SETTINGS',
              FileGroupSettings: {
                Destination: `s3://${process.env.S3_BUCKET_NAME}/output/`
              }
            },
            Outputs: [
              {
                ContainerSettings: { Container: container },
                VideoDescription: {
                  CodecSettings: videoCodecSettings,
                  Width: 1280,
                  Height: 720,
                  ScalingBehavior: 'DEFAULT',
                  Sharpness: 50
                },
                AudioDescriptions: [
                  {
                    AudioSourceName: 'Audio Selector 1',
                    CodecSettings: {
                      Codec: 'AAC',
                      AacSettings: { Bitrate: 96000, CodingMode: 'CODING_MODE_2_0', SampleRate: 48000 }
                    }
                  }
                ]
              }
            ]
          }
        ],
        Inputs: [
          {
            FileInput: `s3://${process.env.S3_BUCKET_NAME}/${inputKey}`,
            AudioSelectors: {
              'Audio Selector 1': {
                DefaultSelection: 'DEFAULT'
              }
            }
          }
        ]
      }
    };
    const job = await mediaConvert.createJob(params).promise();
    // 3. Video kaydını oluştur (output dosyası hazır olunca güncellenecek)
    const video = new Video({
      title,
      filename: inputKey,
      url: '', // Output dosyası hazır olunca güncellenecek
      uploadedBy: req.userId,
      mediaconvertJobId: job.Job.Id,
      format: (format || 'mp4').toLowerCase()
    });
    await video.save();
    res.status(201).json({ message: 'Video yüklendi ve MediaConvert job başlatıldı!', video, jobId: job.Job.Id });
  } catch (err) {
    console.error('MediaConvert Hatası:', err); // Hata detayını terminalde gör
    res.status(500).json({ error: 'Video yüklenirken/MediaConvert job başlatılırken hata oluştu.', details: err });
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
    // Eğer video.uploadedBy yoksa veya null ise (eski kayıtlar için), silmeye izin ver
    if (video.uploadedBy && video.uploadedBy.toString() !== req.userId) {
      return res.status(403).json({ error: 'Bu videoyu silme yetkiniz yok.' });
    }
    // S3'ten sil
    await s3.deleteObject({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: video.filename
    }).promise();
    await video.deleteOne();
    res.json({ message: 'Video S3 ve veritabanından silindi.' });
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
    const { title, format } = req.body;
    if (format && !['mp4', 'mov'].includes(format.toLowerCase())) {
      return res.status(400).json({ error: 'Sadece MP4 ve MOV formatları destekleniyor.' });
    }
    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({ error: 'Video bulunamadı.' });
    }
    if (video.uploadedBy && video.uploadedBy.toString() !== req.userId) {
      return res.status(403).json({ error: 'Bu videoyu güncelleme yetkiniz yok.' });
    }
    if (title) {
      video.title = title;
    }
    let inputKey = video.filename;
    let fileChanged = false;
    // Dosya güncelle (yeni dosya yüklendiyse)
    if (req.file) {
      await s3.deleteObject({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: video.filename
      }).promise();
      const s3Params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: 'input/' + Date.now() + '-' + req.file.originalname,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      };
      await s3.upload(s3Params).promise();
      video.filename = s3Params.Key;
      inputKey = s3Params.Key;
      fileChanged = true;
      video.url = '';
      video.mediaconvertJobId = null;
    }
    // Format değişikliği veya dosya değişikliği varsa MediaConvert job başlat
    const currentFormat = (video.filename.split('.').pop() || '').toLowerCase();
    if (format && (fileChanged || format !== currentFormat)) {
      let container, videoCodecSettings;
      switch (format) {
        case 'mov':
          container = 'MOV';
          videoCodecSettings = {
            Codec: 'H_264',
            H264Settings: {
              RateControlMode: 'QVBR',
              MaxBitrate: 2000000,
              QvbrSettings: { QvbrQualityLevel: 7 },
            }
          };
          break;
        default:
          container = 'MP4';
          videoCodecSettings = {
            Codec: 'H_264',
            H264Settings: {
              RateControlMode: 'QVBR',
              MaxBitrate: 2000000,
              QvbrSettings: { QvbrQualityLevel: 7 },
            }
          };
      }
      const params = {
        Role: process.env.MEDIACONVERT_ROLE_ARN,
        Settings: {
          OutputGroups: [
            {
              Name: 'File Group',
              OutputGroupSettings: {
                Type: 'FILE_GROUP_SETTINGS',
                FileGroupSettings: {
                  Destination: `s3://${process.env.S3_BUCKET_NAME}/output/`
                }
              },
              Outputs: [
                {
                  ContainerSettings: { Container: container },
                  VideoDescription: {
                    CodecSettings: videoCodecSettings,
                    Width: 1280,
                    Height: 720,
                    ScalingBehavior: 'DEFAULT',
                    Sharpness: 50
                  },
                  AudioDescriptions: [
                    {
                      AudioSourceName: 'Audio Selector 1',
                      CodecSettings: {
                        Codec: 'AAC',
                        AacSettings: { Bitrate: 96000, CodingMode: 'CODING_MODE_2_0', SampleRate: 48000 }
                      }
                    }
                  ]
                }
              ]
            }
          ],
          Inputs: [
            {
              FileInput: `s3://${process.env.S3_BUCKET_NAME}/${inputKey}`,
              AudioSelectors: {
                'Audio Selector 1': {
                  DefaultSelection: 'DEFAULT'
                }
              }
            }
          ]
        }
      };
      // Yeni MediaConvert job başlat
      const job = await mediaConvert.createJob(params).promise();
      video.mediaconvertJobId = job.Job.Id;
      video.url = '';
      video.format = (format || 'mp4').toLowerCase();
    }
    await video.save();
    res.json({ message: 'Video güncellendi.', video });
  } catch (err) {
    res.status(500).json({ error: 'Video güncellenirken hata oluştu.' });
  }
};

exports.getSignedVideoUrl = async (req, res) => {
  try {
    const { id } = req.params;
    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({ error: 'Video bulunamadı.' });
    }
    // Sadece yükleyen veya giriş yapan kullanıcı izleyebilsin (isteğe bağlı)
    // if (video.uploadedBy && video.uploadedBy.toString() !== req.userId) {
    //   return res.status(403).json({ error: 'Bu videoyu izleme yetkiniz yok.' });
    // }
    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: video.filename,
      Expires: 60 * 60 // 1 saat
    };
    const signedUrl = s3.getSignedUrl('getObject', params);
    res.json({ url: signedUrl });
  } catch (err) {
    res.status(500).json({ error: 'Video linki alınırken hata oluştu.' });
  }
};

exports.compressVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const { width, height, bitrate } = req.body;
    if (!width || !height || !bitrate) {
      return res.status(400).json({ error: 'Çözünürlük ve bitrate zorunlu.' });
    }
    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({ error: 'Video bulunamadı.' });
    }
    // Sadece yükleyen kullanıcı sıkıştırabilir
    if (video.uploadedBy && video.uploadedBy.toString() !== req.userId) {
      return res.status(403).json({ error: 'Bu videoyu sıkıştırma yetkiniz yok.' });
    }
    // MediaConvert job başlat
    const container = video.format === 'mov' ? 'MOV' : 'MP4';
    const videoCodecSettings = {
      Codec: 'H_264',
      H264Settings: {
        RateControlMode: 'QVBR',
        MaxBitrate: bitrate,
        QvbrSettings: { QvbrQualityLevel: 7 },
      }
    };
    const params = {
      Role: process.env.MEDIACONVERT_ROLE_ARN,
      Settings: {
        OutputGroups: [
          {
            Name: 'File Group',
            OutputGroupSettings: {
              Type: 'FILE_GROUP_SETTINGS',
              FileGroupSettings: {
                Destination: `s3://${process.env.S3_BUCKET_NAME}/output/`
              }
            },
            Outputs: [
              {
                ContainerSettings: { Container: container },
                VideoDescription: {
                  CodecSettings: videoCodecSettings,
                  Width: width,
                  Height: height,
                  ScalingBehavior: 'DEFAULT',
                  Sharpness: 50
                },
                AudioDescriptions: [
                  {
                    AudioSourceName: 'Audio Selector 1',
                    CodecSettings: {
                      Codec: 'AAC',
                      AacSettings: { Bitrate: 96000, CodingMode: 'CODING_MODE_2_0', SampleRate: 48000 }
                    }
                  }
                ]
              }
            ]
          }
        ],
        Inputs: [
          {
            FileInput: `s3://${process.env.S3_BUCKET_NAME}/${video.filename}`,
            AudioSelectors: {
              'Audio Selector 1': {
                DefaultSelection: 'DEFAULT'
              }
            }
          }
        ]
      }
    };
    const job = await mediaConvert.createJob(params).promise();
    video.mediaconvertJobId = job.Job.Id;
    video.url = '';
    video.compressed = true;
    video.compressedWidth = width;
    video.compressedHeight = height;
    video.compressedBitrate = bitrate;
    await video.save();
    res.json({ message: 'Sıkıştırma işlemi başlatıldı.', video });
  } catch (err) {
    res.status(500).json({ error: 'Sıkıştırma başlatılırken hata oluştu.' });
  }
};