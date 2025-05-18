[![SonarQube Cloud](https://sonarcloud.io/images/project_badges/sonarcloud-light.svg)](https://sonarcloud.io/summary/new_code?id=fineksi_fin-invoice-ocr-team6)

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=fineksi_fin-invoice-ocr-team6&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=fineksi_fin-invoice-ocr-team6)

[![Quality gate](https://sonarcloud.io/api/project_badges/quality_gate?project=fineksi_fin-invoice-ocr-team6)](https://sonarcloud.io/summary/new_code?id=fineksi_fin-invoice-ocr-team6)

[![codecov](https://codecov.io/gh/fineksi/fin-invoice-ocr-team6/branch/PBI-1%2FSurya-dev/graph/badge.svg?token=8JYWZOWCML)](https://codecov.io/gh/fineksi/fin-invoice-ocr-team6)

Panduan Cara Melakukan Seeding untuk menghindari konflik di local dapat diakses disini:
https://docs.google.com/document/d/1jIPcekKenMaD4r7-JySo-d9YlO77fbYdLEcN-Smpc1A

<details>
  <summary><strong>Tutorial Menambahkan Sample File dan Menggunakan Script Analisis Documents</strong></summary>

## Tutorial: Menambahkan Sample File dan Menggunakan Script Analisis Documents

Tutorial ini menjelaskan cara menambahkan sample file baru (invoice/purchase order) dan cara menggunakan script untuk menganalisisnya.

### 1. Menambahkan Sample File Baru

**Untuk Invoice:**
1. Simpan file PDF invoice di folder `sample_file/invoice/`
2. Pastikan file memiliki nama yang unik dan deskriptif (misalnya `invoice_company_date.pdf`)

**Untuk Purchase Order:**
1. Simpan file PDF purchase order di folder `sample_file/purchase_order/`
2. Pastikan file memiliki nama yang unik dan deskriptif (misalnya `po_project_date.pdf`)

### 2. Menggunakan Script Analisis

Kami telah menyediakan script untuk menganalisis sample file purchase order. Script ini akan menggunakan Azure Document Intelligence untuk menganalisis dokumen dan menyimpan hasilnya dalam format JSON.

**Untuk Menganalisis Purchase Order:**

Dari direktori root proyek, jalankan:

```bash
# Menganalisis semua file purchase order
node backend/process-purchase-order-samples.js

# Menganalisis file tertentu
node backend/process-purchase-order-samples.js NamaFile.pdf
```

**Hasil Analisis:**
- Hasil analisis akan disimpan di folder `sample_file_result/purchase_order/`
- Setiap file hasil berupa JSON dengan nama yang sama dengan file aslinya
- JSON hasil berisi data mentah dari Azure dan data terstruktur hasil mapping

### 3. Struktur File Hasil

File JSON hasil analisis akan memiliki struktur berikut:

```json
{
  "metadata": {
    "filename": "Sample1_PO.pdf",
    "processedAt": "2025-04-19T10:15:30.123Z",
    "analysisType": "purchase_order"
  },
  "analysisResult": {
    // Hasil lengkap dari Azure Document Intelligence
  },
  "mappedData": {
    // Data yang sudah dipetakan ke struktur terstandarisasi
  }
}
```

### 4. Tips Penggunaan

- Gunakan file PDF yang jelas dan berkualitas baik untuk hasil analisis optimal
- Verifikasi hasil analisis untuk memastikan data dipetakan dengan benar
- Bandingkan hasil antara dokumen yang berbeda untuk memahami kemampuan analisis
- Gunakan hasil analisis untuk mengembangkan dan meningkatkan kemampuan mapping

</details>

<details>
  <summary><strong>Tutorial Penggunaan Winston Logger</strong></summary>

## Tutorial: Menggunakan Winston Logger

Tutorial singkat ini menjelaskan cara mengonfigurasi dan menggunakan Winston Logger secara singkat dalam proyek ini.
---

### 1. Instalasi

Pastikan package `winston` telah terinstal:

```bash
npm install winston
```

### 2. Konfigurasi Basic Logger
Buat file logger.js dan tambahkan kode berikut sesuai service yang diinginkan dan menentukan log akan disimpan dimana (untuk sekarang kodenya sudah dibuat):

```javascript
const winston = require('winston');
const { format } = winston;

const logger = winston.createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp(),
    format.json(),
    format.errors({ stack: true })
  ),
  defaultMeta: { service: 'your-service-name' },
  transports: [
    new winston.transports.Console({
      format: format.combine(
        format.colorize(),
        format.simple()
      )
    }),
    new winston.transports.File({ 
      filename: 'logs/app-error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({ 
      filename: 'logs/app.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  ]
});

module.exports = logger;
```

### 3. Menggunakan Logger dalam Aplikasi
Di file JavaScript lainnya, import dan gunakan logger untuk mencatat aktivitas seperti contoh ini:

```javascript
const logger = require('./logger');

logger.info('Informasi log standar');
logger.error('Pesan error', new Error('Contoh error'));
```

### 4. Manfaat Singkat
- Transparansi: Mencatat tiap aktivitas untuk memudahkan debugging.
- Monitoring: Log dalam format JSON memudahkan integrasi dengan sistem monitoring.

Sekian tutorialnya. Happy coding guys!
</details>

<details>
  <summary><strong>Tutorial Penggunaan K6 Stress Test</strong></summary>

## Tutorial: Menjalankan K6 Stress Test

Tutorial ini menjelaskan bagaimana cara menggunakan K6 untuk melakukan stress testing pada API endpoints.

### 1. Instalasi K6

**MacOS (menggunakan Homebrew):**
```bash
brew install k6
```

**Windows (menggunakan Chocolatey):**
```bash
choco install k6
```

### 2. Menjalankan Stress Test Lokal

#### Untuk Upload Purchase Order:

1. Siapkan file sample untuk testing:
   ```bash
   # Di direktori root proyek
   cp sample_file/purchase_order/Sample1_Bike_PO.pdf backend/tests/stress/
   ```

2. Jalankan stress test untuk upload purchase order:
   ```bash
   cd backend/tests/stress
   k6 run -e API_BASE_URL=http://localhost:3000 -e LOAD_CLIENT_ID=your_client_id -e LOAD_CLIENT_SECRET=your_client_secret upload-po-stress-test.mjs
   ```

#### Mengubah Konfigurasi Test:

Anda dapat mengubah parameter stress test dengan mengedit bagian `options` dalam file .mjs:

```javascript
export const options = {
  stages: [
    { duration: '30s', target: 10},  // Mulai dengan 10 virtual users
    // Ubah stages lainnya sesuai kebutuhan
  ],
  thresholds: {
    error_rate: ['rate<0.6'],  // Maksimal 60% error rate
    latency_p95: ['p(95)<3000'], // 95% request dibawah 3000ms
  }
};
```

### 3. Menjalankan via GitHub Actions

Test juga dapat dijalankan melalui GitHub Actions:

1. Buka repositori GitHub
2. Pilih tab "Actions"
3. Klik workflow "PO Upload Stress Test" 
4. Klik tombol "Run workflow"
5. Setelah selesai, hasil test dapat dilihat di summary dan artifacts

### 4. Memahami Hasil Test

Hasil test K6 mencakup beberapa metrik utama:

- **http_req_duration**: Durasi request (rata-rata, min, max, p90, p95, dst.)
- **http_reqs**: Total jumlah request yang dikirim
- **iterations**: Jumlah eksekusi fungsi default
- **vus**: Jumlah virtual users yang dijalankan
- **error_rate**: Persentase request yang gagal

Contoh output:

```
data_received........: 2.5 MB 84 kB/s
data_sent............: 136 kB 4.5 kB/s
http_req_blocked.....: avg=1.58ms   min=1µs      med=12µs     max=75.27ms  p(90)=30µs     p(95)=1.45ms  
http_req_connecting..: avg=884.12µs min=0s       med=0s       max=40.08ms  p(90)=0s       p(95)=778.39µs
http_req_duration....: avg=506.34ms min=194.95ms med=434.93ms max=2.24s    p(90)=783.36ms p(95)=988.96ms
http_req_receiving...: avg=180.58µs min=46µs     med=146µs    max=2.71ms   p(90)=253.29µs p(95)=360.74µs
http_req_sending.....: avg=228.36µs min=44µs     med=114µs    max=16.48ms  p(90)=218.19µs p(95)=362.99µs
http_req_tls_handshaking: avg=0s      min=0s      med=0s       max=0s       p(90)=0s       p(95)=0s      
http_req_waiting.....: avg=505.93ms min=194.71ms med=434.66ms max=2.24s    p(90)=782.98ms p(95)=988.7ms 
http_reqs............: 300     10/s
iteration_duration...: avg=1.01s    min=695.04ms med=934.97ms max=2.74s    p(90)=1.28s    p(95)=1.48s   
iterations...........: 300     10/s
vus..................: 1       min=1   max=20
vus_max..............: 20      min=20  max=20
```

### 5. Tips Penggunaan

- Mulai dengan beban kecil dan tingkatkan bertahap untuk menemukan batas sistem
- Perhatikan error rate dan latency untuk menilai performa sistem
- Gunakan tag threshold untuk menentukan kriteria pass/fail test
- Selalu kosongkan database test atau gunakan data dummy untuk konsistensi hasil
- Jalankan test di environment terpisah dari produksi

### 6. Struktur Script K6

Script K6 umumnya memiliki beberapa bagian utama:
- Import dari modul k6
- Options untuk konfigurasi test
- Setup untuk persiapan test
- Default function yang dieksekusi oleh virtual users
- Teardown untuk cleanup setelah test

Contoh struktur dasar:
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = { /* konfigurasi */ };

export function setup() { /* persiapan */ }

export default function() { /* kode test utama */ }

export function teardown() { /* cleanup */ }
```

</details>

<details>
  <summary><strong>Tutorial Penggunaan Authentication Penetration Test</strong></summary>

## Tutorial: Menjalankan Authentication Penetration Testing

Tutorial ini menjelaskan cara menggunakan script penetration testing untuk menguji keamanan mekanisme autentikasi API.

### 1. Prasyarat

Pastikan Anda telah menginstal dependensi Python yang diperlukan:

```bash
pip install requests colorama
```

### 2. Menjalankan Penetration Test

```bash
# Di direktori root proyek
python backend/tests/auth_pentest.py

# Atau dengan URL kustom (untuk testing di environment lain)
python backend/tests/auth_pentest.py -u https://api-dev.example.com
```

### 3. Parameter yang Tersedia

Script pengujian menerima beberapa parameter opsional:

```bash
# Melihat bantuan
python backend/tests/auth_pentest.py --help

# Parameter yang tersedia:
# -u, --url       : URL dasar API (default: http://localhost:3000)
# -v, --verbose   : Mengaktifkan output yang lebih detail
```

### 4. Jenis Pengujian yang Dilakukan

Script penetration testing menguji beberapa aspek keamanan autentikasi:

1. **Missing Credentials Test**: Menguji respons API ketika kredensial tidak lengkap atau kosong
2. **Credential Manipulation Test**: Menguji perlindungan terhadap SQL injection dan serangan manipulasi kredensial lainnya
3. **Credential Leakage Test**: Memastikan tidak ada kebocoran informasi kredensial dalam respons error

### 5. Memahami Hasil Pengujian

Hasil pengujian ditampilkan dalam format yang mudah dibaca dengan kode warna:

- **[PASS]** 🟢: Pengujian berhasil, sistem merespons dengan benar
- **[FAIL]** 🔴: Pengujian gagal, menunjukkan potensi kerentanan keamanan
- **[ERROR]** 🟡: Kesalahan selama pengujian, perlu diperiksa lebih lanjut

Di akhir pengujian, laporan ringkas akan ditampilkan dengan:
- Jumlah total tes yang dijalankan
- Jumlah tes yang berhasil/gagal
- Daftar kerentanan yang ditemukan (jika ada)
- Rekomendasi perbaikan keamanan

### 6. Best Practice Penggunaan

- Jalankan pengujian di lingkungan pengembangan, bukan di produksi
- Selalu dapatkan izin sebelum menjalankan pengujian keamanan
- Perbaiki segera kerentanan yang ditemukan
- Jalankan pengujian secara berkala sebagai bagian dari pipeline CI/CD
- Gunakan hasil pengujian untuk meningkatkan keamanan autentikasi secara berkelanjutan

### 7. Tips Pengembangan

Jika ingin menambah pengujian keamanan baru:

1. Tambahkan metode pengujian baru di kelas `AuthenticationPenTester`
2. Panggil metode tersebut dari metode `run_tests()`
3. Implementasikan logika pengujian yang sesuai
4. Pastikan untuk menangani kesalahan dengan blok try-except
5. Tambahkan rekomendasi yang sesuai di metode `print_report()`

</details>

<details>

  <summary><strong>Tutorial Profiling dengan JavaScript Debug Terminal</strong></summary>

## Tutorial: Profiling Aplikasi dengan JavaScript Debug Terminal

Tutorial ini menjelaskan langkah-langkah cara melakukan profiling pada aplikasi JavaScript menggunakan VS Code Debug Terminal untuk mengidentifikasi bottleneck performa.

### 1. Persiapan VS Code Debug

1. Buka project Node.js yang ingin diprofile di VS Code
2. Buka terminal di VS Code dengan menekan `Ctrl+`` (atau menu Terminal > New Terminal)
3. Ubah terminal biasa menjadi JavaScript Debug Terminal dengan:
   - Klik dropdown terminal (▾) di pojok kanan atas panel terminal
   - Pilih "JavaScript Debug Terminal"

### 2. Menambahkan Breakpoints

1. Buka file JavaScript yang ingin di-profile (misalnya `purchaseOrderService.js`)
2. Tambahkan breakpoint di titik awal fungsi yang ingin dianalisis:
   - Klik pada gutter (area sebelah kiri nomor baris) pada baris kode yang sesuai
   - Atau letakkan kursor pada baris kode dan tekan F9

3. **Tips**: Tambahkan breakpoint di awal dan akhir fungsi untuk mengukur durasi eksekusi fungsi tersebut.

### 3. Memulai Profiling

1. Di JavaScript Debug Terminal, jalankan aplikasi seperti biasa:
   ```bash
   # Misalnya menjalankan backend
   npm start
   ```

2. Lakukan aksi yang mengaktifkan kode target profiling (misalnya upload file atau hit endpoint API)

3. Ketika eksekusi mencapai breakpoint, VS Code akan menampilkan mode debug:
   - Klik tombol "Continue" atau tekan F5 untuk melanjutkan eksekusi
   - Klik tombol "Step Over" (F10) untuk menjalankan baris demi baris

### 4. Mengumpulkan Data Profiling

1. Saat aplikasi berhenti di breakpoint, buka panel Debug di sidebar (ikon bug/serangga)
2. Klik tab "Performance"
3. Klik tombol "Start Performance Profile" atau "Record Performance Profile" (ikon ⚫)
4. Lanjutkan atau selesaikan eksekusi kode yang ingin diprofile
5. Klik tombol "Stop" (ikon ⬛) untuk menghentikan profiling

### 5. Melihat dan Menganalisis Flame Graph

1. Setelah profiling selesai, VS Code akan membuka flame graph secara otomatis:

2. Memahami Flame Graph:
   - Sumbu X: Representasi distribusi waktu CPU
   - Sumbu Y: Stack panggilan fungsi (semakin tinggi = semakin dalam)
   - Lebar frame/blok: Proporsi waktu yang digunakan oleh fungsi tersebut
   - Warna: Jenis aktivitas

3. Cara menganalisis:
   - Fokus pada frame/blok yang paling lebar (mengkonsumsi waktu paling banyak)
   - Zoom in/out menggunakan wheel mouse atau gesture pinch
   - Hover pada frame untuk melihat detail fungsi dan waktu eksekusi

### 6. Tips Profiling Lanjutan

- **Heap Snapshot**: Untuk analisis memori, gunakan "Take heap snapshot" setelah breakpoint
- **Kontinyu vs. Selektif**: 
  - Profiling kontinyu: Rekam seluruh eksekusi program
  - Profiling selektif: Start/stop manual di sekitar kode yang mencurigakan
- **Profiling Endpoint API**: Tambahkan breakpoint di handler route untuk menganalisis performa endpoint

</details>

<summary><strong>Tutorial Menambahkan Model OCR</strong></summary>

## Gambaran Umum

Sistem ini menggunakan arsitektur analyzer OCR yang fleksibel yang mendukung beberapa mesin OCR melalui factory pattern. Hal ini memungkinkan kita untuk:

- Menggunakan mesin OCR yang berbeda untuk jenis dokumen yang berbeda
- Beralih antar penyedia OCR tanpa mengubah kode
- Dengan mudah menambahkan teknologi OCR baru saat tersedia

Arsitektur intinya terdiri dari:
- `OcrAnalyzer`: Kelas dasar abstrak yang mendefinisikan interface
- `OcrAnalyzerFactory`: Factory untuk membuat instance analyzer
- Implementasi concrete analyzer (Azure, Dummy, dll.)

### Step 1: Membuat Kelas Analyzer Baru

Buat file baru di `backend/src/services/analysis/` untuk analyzer. Misalnya, `googleVisionAnalyzer.js`:

```javascript
const OcrAnalyzer = require('./OcrAnalyzer');
const Sentry = require("../../instrument");

class GoogleVisionAnalyzer extends OcrAnalyzer {
  constructor(config = {}) {
    super();
    this.apiKey = config.apiKey || process.env.GOOGLE_VISION_API_KEY;
    // Tambahkan properti konfigurasi lain sesuai kebutuhan
  }

  getType() {
    return 'google-vision';
  }

  async analyzeDocument(documentSource) {
    if (!documentSource) {
      throw new Error("documentSource is required");
    }

    return Sentry.startSpan(
      {
        name: "analyzeDocumentWithGoogleVision",
        attributes: {
          documentSource: typeof documentSource === "string" ? "url" : "buffer",
          analyzerType: "google-vision"
        },
      },
      async (span) => {
        try {
          // Implementasikan integrasi Google Vision API di sini
          
          // Proses dan transformasikan hasil agar sesuai dengan format yang diharapkan
          
          return {
            message: "Dokumen diproses dengan Google Vision",
            data: processedResult
          };
        } catch (error) {
          Sentry.captureException(error);
          throw new Error(`Google Vision analyzer gagal: ${error.message}`);
        } finally {
          span.end();
        }
      }
    );
  }
}

module.exports = GoogleVisionAnalyzer;
```

### Langkah 2: Register Analyzer Baru

Import dan register analyzer baru di `backend/src/services/analysis/index.js`:

```javascript
const OcrAnalyzer = require('./OcrAnalyzer');
const OcrAnalyzerFactory = require('./OcrAnalyzerFactory');
const AzureDocumentAnalyzer = require('./azureDocumentAnalyzer');
const DummyOcrAnalyzer = require('./DummyOcrAnalyzer');
const GoogleVisionAnalyzer = require('./googleVisionAnalyzer');

OcrAnalyzerFactory.registerAnalyzerType('dummy', DummyOcrAnalyzer);
OcrAnalyzerFactory.registerAnalyzerType('google-vision', GoogleVisionAnalyzer); // Tambahkan ini

// Ekspor semua komponen
module.exports = {
  OcrAnalyzer,
  OcrAnalyzerFactory,
  AzureDocumentAnalyzer,
  DummyOcrAnalyzer,
  GoogleVisionAnalyzer // Tambahkan ini
};
```

### Langkah 3: Menggunakan Analyzer Baru

Gunakan analyzer baru Anda seperti yang sudah ada:

```javascript
const { OcrAnalyzerFactory } = require('./services/analysis');

// Membuat Google Vision analyzer
const analyzer = OcrAnalyzerFactory.createAnalyzer('google-vision', {
  apiKey: 'your-google-api-key'
});

// Menganalisis dokumen
const result = await analyzer.analyzeDocument(documentSource);
```

Untuk mengaktifkan analyzer baru, pastikan untuk mengonfigurasi value `OCR_ANALYZER_TYPE` di file `.env`:

```env
OCR_ANALYZER_TYPE=google-vision
```
