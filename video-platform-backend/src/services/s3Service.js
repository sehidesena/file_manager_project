const AWS = require('aws-sdk');

// AWS S3 bağlantı ayarları
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID, // .env dosyasından alınmalı
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY, // .env dosyasından alınmalı
    region: process.env.AWS_REGION // .env dosyasından alınmalı
});

module.exports = s3;