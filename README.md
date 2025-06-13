# Videofy: Bulut Tabanlı Video İşleme ve Depolama Platformu

## Proje Hakkında

Videofy, kullanıcıların video dosyalarını buluta yükleyip AWS altyapısı ile işleyebildiği (format dönüştürme, sıkıştırma), güvenli şekilde saklayıp izleyebildiği modern bir video platformudur. Platform, React tabanlı frontend ve Node.js/Express tabanlı backend ile geliştirilmiştir. Videolar AWS S3 üzerinde depolanır, işleme için AWS MediaConvert kullanılır.

## Özellikler

- **Video Yükleme ve Depolama:** Kullanıcılar giriş yaptıktan sonra video yükleyebilir, videolar AWS S3'te saklanır.
- **Video İşleme:** Yüklenen videolar otomatik olarak AWS MediaConvert ile işlenir. Kullanıcılar videolarını farklı formata (MP4/MOV) dönüştürebilir veya sıkıştırabilir.
- **Video Akışı (Streaming):** İşlenen videolar S3 üzerinden güvenli, imzalı linklerle stream edilebilir.
- **Güvenlik ve Erişim Kontrolü:** JWT tabanlı kimlik doğrulama ile tüm işlemler koruma altındadır.
- **Veri Analitiği:** Toplam video sayısı, en çok kullanılan format, en çok video yükleyen kullanıcı gibi istatistikler sunar.
- **Kullanıcıya Özel Video Yönetimi:** Her kullanıcı kendi videolarını görebilir, silebilir, güncelleyebilir.

## Kullanılan Teknolojiler

- **Frontend:** React (Vite)
- **Backend:** Node.js, Express, MongoDB
- **Bulut:** AWS S3 (depolama), AWS MediaConvert (işleme)
- **Kimlik Doğrulama:** JWT

## Kurulum ve Çalıştırma

### 1. Backend

```bash
cd video-platform-backend
npm install
# .env dosyasını doldurun (AWS ve MongoDB bilgileriyle)
npm start
```

### 2. Frontend

```bash
cd video-platform-frontend
npm install
npm run dev
```

### 3. Ortam Değişkenleri

Backend klasöründe bir `.env` dosyası oluşturun ve aşağıdaki bilgileri doldurun:

```
PORT=5050
MONGODB_URI=... # MongoDB bağlantı adresiniz
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=...
S3_BUCKET_NAME=...
MEDIACONVERT_ENDPOINT=...
MEDIACONVERT_ROLE_ARN=...
```

## Demo Akışı

1. **Kayıt Ol / Giriş Yap:** Kullanıcı hesabı oluşturun veya giriş yapın.
2. **Video Yükle:** Başlık girin, dosya seçin, format seçin ve yükleyin.
3. **Video Listesi:** Tüm videoları veya kendi videolarınızı görüntüleyin.
4. **Video Oynat / Sil / Güncelle / Sıkıştır:** Videolar üzerinde işlemler yapın.
5. **Analitik:** "Analitik" butonuna tıklayarak sistemdeki video istatistiklerini görüntüleyin.

## Ekran Görüntüleri

- ![Arayüz Ekran Görüntüsü](docs/screenshot1.png)
- ![Analitik Modal](docs/screenshot2.png)

## Katkı ve Lisans

Bu proje eğitim ve demo amaçlıdır. Katkıda bulunmak için fork'layabilir, pull request gönderebilirsiniz.

---

**Hazırlayan:** [Senad](https://github.com/senad)  
Tarih: Haziran 2025
