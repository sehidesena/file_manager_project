// JWT doğrulama middleware'i
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Token gerekli.' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'gizli_anahtar');
    req.userId = decoded.id;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Geçersiz veya süresi dolmuş token.' });
  }
};
