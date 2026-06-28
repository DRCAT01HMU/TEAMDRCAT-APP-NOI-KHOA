const CACHE_NAME = 'casetest-pwa-v4.0.0';
const urlsToCache = ["./", "./3D_BASEDOW.html", "./3D_BƯỚU NHÂN TUYẾN GIÁP.html", "./3D_BỆNH THẬN MẠN TÍNH.html", "./3D_COPD.html", "./3D_CẤP CỨU NGỪNG TUẦN HOÀN.html", "./3D_GIÃN PHẾ QUẢN.html", "./3D_GOUT.html", "./3D_HCTH NGƯỜI LỚN.html", "./3D_HEMOPHILIA.html", "./3D_HEN PHẾ QUẢN.html", "./3D_HỘI CHỨNG CUSHING.html", "./3D_HỘI CHỨNG VÀNH CẤP.html", "./3D_LOÃNG XƯƠNG NGUYÊN PHÁT.html", "./3D_LUPUS BAN ĐỎ HỆ THỐNG.html", "./3D_LƠ XƠ MI CẤP.html", "./3D_LỌC MÀNG BỤNG.html", "./3D_NGỘ ĐỘC CẤP.html", "./3D_NHIỄM KHUẨN TIẾT NIỆU.html", "./3D_RỐI LOẠN NƯỚC ĐIỆN GIẢI.html", "./3D_SARCOPENIA.html", "./3D_STEMIN TRÊN NỀN CKD.html", "./3D_SUY GIÁP.html", "./3D_SUY HÔ HẤP CẤP.html", "./3D_SUY TIM MẠN.html", "./3D_SUY TUYẾN THƯỢNG THẬN.html", "./3D_TDMP TKMP.html", "./3D_THIẾU MÁU.html", "./3D_THOÁI HÓA KHỚP.html", "./3D_TRUYỀN MÁU.html", "./3D_TĂNG HUYẾT ÁP.html", "./3D_TỔN THƯƠNG THẬN CẤP AKI.html", "./3D_U LYMPHO.html", "./3D_VIÊM CỘT SỐNG DÍNH KHỚP.html", "./3D_VIÊM GAN B.html", "./3D_VIÊM KHỚP DẠNG THẤP.html", "./3D_VIÊM LOÉT DẠ DÀY TÁ TRÀNG.html", "./3D_VIÊM PHỔI CỘNG ĐỒNG.html", "./3D_VIÊM TỤY CẤP.html", "./3D_XUẤT HUYẾT TIÊU HÓA TRÊN.html", "./3D_XƠ GAN.html", "./3D_ÁP XE GAN.html", "./3D_ĐÁI MÁU.html", "./3D_ĐÁI THÁO ĐƯỜNG.html", "./3D_ĐỘNG KINH.html", "./3D_ĐỘT QUỴ NÃO.html", "./index.html", "./manifest.json", "./sw.js"];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) return caches.delete(cacheName);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      const fetchPromise = fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, networkResponse.clone());
          });
        }
        return networkResponse;
      }).catch(err => {});
      return cachedResponse || fetchPromise;
    })
  );
});
