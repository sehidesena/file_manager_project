// Konfigürasyon dosyası. Ortam değişkenleri ve bağlantı ayarları burada tutulacak.
require('dotenv').config();

module.exports = {
  mongoURI: process.env.MONGO_URI,
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  awsRegion: process.env.AWS_REGION,
  s3Bucket: process.env.S3_BUCKET,
};
