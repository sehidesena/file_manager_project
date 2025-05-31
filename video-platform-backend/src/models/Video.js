const mongoose = require('mongoose');

const VideoSchema = new mongoose.Schema({
  title: { type: String, required: true },
  filename: { type: String, required: true },
  url: { type: String },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  mediaconvertJobId: { type: String },
  format: { type: String, default: 'mp4' },
  compressed: { type: Boolean, default: false },
  compressedWidth: { type: Number },
  compressedHeight: { type: Number },
  compressedBitrate: { type: Number },
});

module.exports = mongoose.model('Video', VideoSchema);