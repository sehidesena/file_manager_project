import React, { useEffect, useState } from 'react';
import './App.css';

const API_BASE = 'http://localhost:5050/api'; // Backend API ana adresi

const VIDEO_FORMATS = [
  { label: 'MP4 (H.264)', value: 'mp4' },
  { label: 'MOV (H.264)', value: 'mov' },
];
const RESOLUTIONS = [
  { label: '720p (1280x720)', width: 1280, height: 720 },
  { label: '1080p (1920x1080)', width: 1920, height: 1080 },
  { label: '480p (854x480)', width: 854, height: 480 },
];
const BITRATES = [
  { label: '1 Mbps', value: 1000000 },
  { label: '2 Mbps', value: 2000000 },
  { label: '4 Mbps', value: 4000000 },
];

function App() {
  // Auth state
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [authForm, setAuthForm] = useState({ username: '', email: '', password: '' });
  const [authMessage, setAuthMessage] = useState('');

  // Video state
  const [videos, setVideos] = useState([]);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState(null);
  const [format, setFormat] = useState('mp4');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [showMyVideos, setShowMyVideos] = useState(false);
  const [updateId, setUpdateId] = useState(null);
  const [updateTitle, setUpdateTitle] = useState('');
  const [updateFile, setUpdateFile] = useState(null);
  const [updateFormat, setUpdateFormat] = useState('mp4');
  const [compressId, setCompressId] = useState(null);
  const [compressResolution, setCompressResolution] = useState(RESOLUTIONS[0]);
  const [compressBitrate, setCompressBitrate] = useState(BITRATES[0].value);
  const [compressLoading, setCompressLoading] = useState(false);

  // Auth işlemleri
  const handleAuthChange = e => setAuthForm({ ...authForm, [e.target.name]: e.target.value });

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthMessage('');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/${authMode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authForm),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        setToken(data.token);
        localStorage.setItem('token', data.token);
        setAuthMessage('Giriş başarılı!');
      } else if (res.ok) {
        setAuthMessage(data.message || 'Kayıt başarılı! Giriş yapabilirsiniz.');
        if (authMode === 'register') setAuthMode('login');
      } else {
        setAuthMessage(data.error || 'Hata!');
      }
    } catch (err) {
      setAuthMessage('Sunucu hatası!');
    }
    setLoading(false);
  };

  const handleLogout = () => {
    setToken('');
    localStorage.removeItem('token');
    setAuthForm({ username: '', email: '', password: '' });
    setMessage('Çıkış yapıldı.');
  };

  // Videoları listele (tüm videolar veya kullanıcıya özel)
  const fetchVideos = async () => {
    setLoading(true);
    try {
      const url = showMyVideos ? `${API_BASE}/video/my-videos` : `${API_BASE}/video/list`;
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      setVideos(data);
    } catch (err) {
      setMessage('Videolar alınamadı!');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (token) fetchVideos();
    // eslint-disable-next-line
  }, [token, showMyVideos]);

  // Video yükle
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !title) return setMessage('Başlık ve dosya gerekli!');
    setLoading(true);
    setMessage('');
    setUploadProgress(0);
    const formData = new FormData();
    formData.append('title', title);
    formData.append('video', file);
    formData.append('format', format);
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE}/video/upload`);
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          setUploadProgress(Math.round((event.loaded / event.total) * 100));
        }
      };
      xhr.onload = () => {
        setLoading(false);
        setUploadProgress(0);
        if (xhr.status === 201) {
          setMessage('Video yüklendi!');
          setTitle('');
          setFile(null);
          fetchVideos();
        } else {
          const data = JSON.parse(xhr.responseText);
          setMessage(data.error || 'Yükleme hatası!');
        }
      };
      xhr.onerror = () => {
        setLoading(false);
        setUploadProgress(0);
        setMessage('Yükleme sırasında hata!');
      };
      xhr.send(formData);
    } catch (err) {
      setLoading(false);
      setUploadProgress(0);
      setMessage('Yükleme sırasında hata!');
    }
  };

  // Video sil
  const handleDelete = async (id) => {
    if (!window.confirm('Bu videoyu silmek istediğinize emin misiniz?')) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/video/delete/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Video silindi!');
        fetchVideos();
      } else {
        setMessage(data.error || 'Silme hatası!');
      }
    } catch (err) {
      setMessage('Silme sırasında hata!');
    }
    setLoading(false);
  };

  // Video oynat (işlenmişse url alanı dolu olur)
  const handlePlay = (video) => {
    if (!video.url) return alert('Video henüz işlenmedi!');
    window.open(video.url, '_blank');
  };

  // Video önizleme
  const handlePreview = () => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setShowPreview(true);
  };

  // Güncelleme işlemleri
  const startUpdate = (video) => {
    setUpdateId(video._id);
    setUpdateTitle(video.title);
    setUpdateFile(null);
    setUpdateFormat(video.filename?.split('.').pop()?.toLowerCase() || 'mp4');
  };
  const cancelUpdate = () => {
    setUpdateId(null);
    setUpdateTitle('');
    setUpdateFile(null);
    setUpdateFormat('mp4');
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!updateId) return;
    setLoading(true);
    setMessage('');
    const formData = new FormData();
    if (updateTitle) formData.append('title', updateTitle);
    if (updateFile) formData.append('video', updateFile);
    if (updateFormat) formData.append('format', updateFormat);
    try {
      const res = await fetch(`${API_BASE}/video/update/${updateId}`, {
        method: 'PUT',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Video güncellendi!');
        fetchVideos();
        cancelUpdate();
      } else {
        setMessage(data.error || 'Güncelleme hatası!');
      }
    } catch (err) {
      setMessage('Güncelleme sırasında hata!');
    }
    setLoading(false);
  };

  // Sıkıştırma işlemi başlat
  const startCompress = (video) => {
    setCompressId(video._id);
    setCompressResolution(RESOLUTIONS[0]);
    setCompressBitrate(BITRATES[0].value);
  };
  const cancelCompress = () => {
    setCompressId(null);
    setCompressResolution(RESOLUTIONS[0]);
    setCompressBitrate(BITRATES[0].value);
  };
  const handleCompress = async (e) => {
    e.preventDefault();
    if (!compressId) return;
    setCompressLoading(true);
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/video/compress/${compressId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          width: compressResolution.width,
          height: compressResolution.height,
          bitrate: compressBitrate,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Sıkıştırma işlemi başlatıldı!');
        fetchVideos();
        cancelCompress();
      } else {
        setMessage(data.error || 'Sıkıştırma hatası!');
      }
    } catch (err) {
      setMessage('Sıkıştırma sırasında hata!');
    }
    setCompressLoading(false);
  };

  // Auth formu
  if (!token) {
    return (
      <div className="container">
        <h1>Video Platform</h1>
        <div className="auth-toggle">
          <button onClick={() => setAuthMode('login')} className={authMode === 'login' ? 'active' : ''}>Giriş Yap</button>
          <button onClick={() => setAuthMode('register')} className={authMode === 'register' ? 'active' : ''}>Kayıt Ol</button>
        </div>
        <form className="auth-form" onSubmit={handleAuth}>
          {authMode === 'register' && (
            <input
              type="text"
              name="username"
              placeholder="Kullanıcı adı"
              value={authForm.username}
              onChange={handleAuthChange}
              required
            />
          )}
          <input
            type="email"
            name="email"
            placeholder="E-posta"
            value={authForm.email}
            onChange={handleAuthChange}
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Şifre"
            value={authForm.password}
            onChange={handleAuthChange}
            required
          />
          <button type="submit" disabled={loading}>{authMode === 'login' ? 'Giriş Yap' : 'Kayıt Ol'}</button>
        </form>
        {authMessage && <div className="message">{authMessage}</div>}
      </div>
    );
  }

  // Video arayüzü
  return (
    <div className="container">
      <h1>Videofy</h1>
      <button className="logout-btn" onClick={handleLogout}>Çıkış Yap</button>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <button onClick={() => setShowMyVideos(false)} className={!showMyVideos ? 'active' : ''}>Tüm Videolar</button>
        <button onClick={() => setShowMyVideos(true)} className={showMyVideos ? 'active' : ''}>Benim Videolarım</button>
      </div>
      <form className="upload-form" onSubmit={handleUpload}>
        <input
          type="text"
          placeholder="Video başlığı"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
        <input
          type="file"
          accept="video/*"
          onChange={e => setFile(e.target.files[0])}
        />
        <select value={format} onChange={e => setFormat(e.target.value)}>
          {VIDEO_FORMATS.map(f => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
        <button type="button" onClick={handlePreview} disabled={!file}>Önizle</button>
        <button type="submit" disabled={loading}>Yükle</button>
      </form>
      {uploadProgress > 0 && (
        <div className="progress-bar">
          <div className="progress" style={{ width: `${uploadProgress}%` }} />
        </div>
      )}
      {showPreview && previewUrl && (
        <div className="preview-modal" onClick={() => setShowPreview(false)}>
          <video src={previewUrl} controls style={{ maxWidth: 400, maxHeight: 300 }} />
        </div>
      )}
      {message && <div className="message">{message}</div>}
      <h2>Videolar</h2>
      {loading ? <div>Yükleniyor...</div> : (
        <div className="video-list">
          {videos.length === 0 && <div>Henüz video yok.</div>}
          {videos.map(video => (
            <div className="video-card" key={video._id}>
              <div className="video-title">{video.title}</div>
              <div className="video-meta">
                <span>Format: {(video.format || video.filename?.split('.').pop() || 'mp4').toUpperCase()}</span>
                <span style={{ marginLeft: 12, color: '#aaa', fontSize: '0.95em' }}>
                  {new Date(video.createdAt).toLocaleString('tr-TR')}
                </span>
              </div>
              <div className="video-actions">
                <button onClick={() => handlePlay(video)} disabled={!video.url}>Oynat</button>
                <button onClick={() => handleDelete(video._id)} disabled={loading}>Sil</button>
                <button onClick={() => startUpdate(video)} disabled={loading}>Güncelle</button>
                <button onClick={() => startCompress(video)} disabled={loading}>Sıkıştır</button>
              </div>
              <div className="video-status">
                {video.url ? 'İşlendi' : 'İşleniyor...'}
              </div>
              {updateId === video._id && (
                <form className="update-form" onSubmit={handleUpdate}>
                  <input
                    type="text"
                    placeholder="Yeni başlık"
                    value={updateTitle}
                    onChange={e => setUpdateTitle(e.target.value)}
                  />
                  <input
                    type="file"
                    accept="video/*"
                    onChange={e => setUpdateFile(e.target.files[0])}
                  />
                  <select value={updateFormat} onChange={e => setUpdateFormat(e.target.value)}>
                    {VIDEO_FORMATS.map(f => (
                      <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                  </select>
                  <button type="submit" disabled={loading}>Kaydet</button>
                  <button type="button" onClick={() => cancelUpdate()}>İptal</button>
                </form>
              )}
              {compressId === video._id && (
                <form className="update-form" onSubmit={handleCompress} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
                  <label>Çözünürlük:
                    <select value={compressResolution.label} onChange={e => setCompressResolution(RESOLUTIONS.find(r => r.label === e.target.value))}>
                      {RESOLUTIONS.map(r => (
                        <option key={r.label} value={r.label}>{r.label}</option>
                      ))}
                    </select>
                  </label>
                  <label>Bitrate:
                    <select value={compressBitrate} onChange={e => setCompressBitrate(Number(e.target.value))}>
                      {BITRATES.map(b => (
                        <option key={b.value} value={b.value}>{b.label}</option>
                      ))}
                    </select>
                  </label>
                  <button type="submit" disabled={compressLoading}>Sıkıştır</button>
                  <button type="button" onClick={cancelCompress}>İptal</button>
                </form>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
