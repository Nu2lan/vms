# ASAN VMS - Müraciət Sistemi

Vətəndaş müraciətlərinin idarə edilməsi üçün tam funksional veb tətbiqi. Sİ (Gemini) ilə avtomatik təhlil, şəkil yükləmə, EXIF məkan çıxarma və admin yoxlama sistemi daxildir.

## Layihə Strukturu

```
aiasan/
├── backend/    # Node.js + Express + MongoDB API
├── admin/      # React (Vite) - Admin paneli
└── user/       # React (Vite) - Vətəndaş paneli
```

## Texnologiyalar

- **Backend:** Node.js, Express, MongoDB, Mongoose, Gemini AI
- **Frontend:** React, Vite, Tailwind CSS, Axios, Lucide Icons
- **Digər:** JWT Authentication, EXIF GPS extraction, Multer file upload

## Quraşdırma

### 1. Backend
```bash
cd backend
npm install
```

`.env` faylı yaradın:
```env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
GEMINI_API_KEY=your_gemini_api_key
PORT=5000
```

```bash
node app.js
```

### 2. Admin Panel
```bash
cd admin
npm install
npm run dev
```

### 3. Vətəndaş Paneli
```bash
cd user
npm install
npm run dev
```

## Əsas Xüsusiyyətlər

- 📸 Şəkil yükləmə və kamera ilə çəkmə
- 🤖 Gemini Sİ ilə avtomatik kateqoriya, prioritet və təsvir
- 📍 EXIF-dən GPS məkan çıxarma
- 👨‍💼 Admin paneli: müraciətlərin idarəsi, redaktəsi, yoxlanması
- ✅ Həll yoxlama sistemi (Sİ ilə müqayisə)
- ❌ Rədd etmə sistemi (səbəb ilə)
- 🌐 Tam Azərbaycan dili dəstəyi