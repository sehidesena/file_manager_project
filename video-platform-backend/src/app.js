// Temel Express.js uygulaması kurulumu
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const connectDB = require('./utils/db');
const authRoutes = require('./routes/auth');
const videoRoutes = require('./routes/video');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Basit ana endpoint
defaultRouter = (req, res) => {
  res.json({ message: 'Video Platform Backend API Çalışıyor!' });
};
app.get('/', defaultRouter);

// Kullanıcı kayıt ve giriş işlemleri için auth route'u
app.use('/api/auth', authRoutes);
// Video yükleme işlemleri için video route'u
app.use('/api/video', videoRoutes);

// Uploads klasörünü statik olarak sun
app.use('/uploads', express.static(require('path').join(__dirname, '../uploads')));

// Hata yönetimi middleware
defaultErrorHandler = (err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Bir hata oluştu!' });
};
app.use(defaultErrorHandler);

// MongoDB bağlantısını başlat
connectDB();

// Sunucuyu başlat
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server ${PORT} portunda çalışıyor...`);
});
