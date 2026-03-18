import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3900;

// X-Powered-By 숨기기
app.disable("x-powered-by");

// 보안 헤더
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Content-Security-Policy", "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

// public/ 디렉토리만 서빙 (server.js, package.json 등 노출 차단)
const publicDir = path.join(__dirname, "public");
app.use(express.static(publicDir, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith(".dmg") || filePath.endsWith(".exe") || filePath.endsWith(".msi")) {
      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader("Content-Disposition", `attachment; filename="${path.basename(filePath)}"`);
    }
  }
}));

// 404 핸들러
app.use((req, res) => {
  res.status(404).send("Not Found");
});

app.listen(PORT, () => {
  console.log(`dskube landing server running on :${PORT}`);
});
