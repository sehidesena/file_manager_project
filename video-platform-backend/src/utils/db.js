// Mongoose ile MongoDB bağlantısı
const mongoose = require('mongoose');
const { mongoURI } = require('../../config');

const connectDB = async () => {
  try {
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB bağlantısı başarılı!');
  } catch (err) {
    console.error('MongoDB bağlantı hatası:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
