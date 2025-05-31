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
        // Output formatını Video kaydındaki format alanından veya job ayarlarından belirle
        let format = (video.format || '').toLowerCase();
        if (!format) {
          // Job ayarlarından container'ı bulmaya çalış
          const output = job.Job.Settings.OutputGroups[0].Outputs[0];
          const container = output.ContainerSettings.Container;
          switch (container) {
            case 'WEBM': format = 'webm'; break;
            case 'MOV': format = 'mov'; break;
            case 'AVI': format = 'avi'; break;
            default: format = 'mp4';
          }
        }
        // Output dosya adını doğru formatla oluştur
        const inputKey = video.filename.split('/').pop();
        const outputKey = `output/${inputKey.replace(/\.[^/.]+$/, '.' + format)}`;
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
        // Formatı da kaydet (Video modelinde format alanı yoksa custom alan olarak ekle)
        video.format = format;
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
