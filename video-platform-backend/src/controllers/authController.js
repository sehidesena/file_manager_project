// Kullanıcı işlemleri controller
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Kullanıcı kaydı
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    // Kullanıcı var mı kontrolü
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ error: 'Kullanıcı zaten mevcut.' });
    }
    // Şifreyi hashle
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashedPassword });
    await user.save();
    res.status(201).json({ message: 'Kayıt başarılı!' });
  } catch (err) {
    res.status(500).json({ error: 'Kayıt sırasında hata oluştu.' });
  }
};

// Kullanıcı girişi
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Kullanıcı bulunamadı.' });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Şifre hatalı.' });
    }
    // JWT token oluştur
    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET || 'gizli_anahtar',
      { expiresIn: '1d' }
    );
    res.json({ message: 'Giriş başarılı!', token });
  } catch (err) {
    res.status(500).json({ error: 'Giriş sırasında hata oluştu.' });
  }
};
