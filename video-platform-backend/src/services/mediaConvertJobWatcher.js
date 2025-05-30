// MediaConvert joblarını izleyen ve tamamlanan işlerin çıktısını Video modeline kaydeden servis
const AWS = require('aws-sdk');
const Video = require('../models/Video');
const s3 = require('./s3Service');

const mediaConvert = new AWS.MediaConvert({
  endpoint: process.env.MEDIACONVERT_ENDPOINT,
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

// Tamamlanmamış videoları bulup, job durumunu kontrol et
async function checkMediaConvertJobs() {
  // url alanı boş ve mediaconvertJobId olan videoları bul
  const videos = await Video.find({ url: '', mediaconvertJobId: { $exists: true, $ne: null } });
  for (const video of videos) {
    try {
      const job = await mediaConvert.getJob({ Id: video.mediaconvertJobId }).promise();
      if (job.Job.Status === 'COMPLETE') {
        // Output dosyasının adını tahmin et (input dosya adıyla aynı, sadece klasör değişiyor)
        const inputKey = video.filename.split('/').pop();
        const outputKey = `output/${inputKey.replace(/\.[^/.]+$/, '.mp4')}`;
        // S3'te dosya var mı kontrol et
        await s3.headObject({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: outputKey
        }).promise();
        // Signed URL oluştur
        const url = s3.getSignedUrl('getObject', {
          Bucket: process.env.S3_BUCKET_NAME,
          Key: outputKey,
          Expires: 60 * 60 * 24 * 7 // 7 gün
        });
        video.url = url;
        await video.save();
        console.log(`Video güncellendi: ${video.title}`);
      }
    } catch (err) {
      // Job tamamlanmadıysa veya dosya yoksa hata verebilir, logla ve devam et
       console.log(`Job kontrolü: ${video.mediaconvertJobId} - ${err.message}`);
    }
  }
}

module.exports = { checkMediaConvertJobs };
