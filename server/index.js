require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const mysql = require("mysql2/promise");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

async function getDB() {
  return mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
}

// POST /upload
app.post("/upload", upload.single("photo"), async (req, res) => {
  try {
    const { uploader_name } = req.body;
    const file = req.file;

    if (!file || !uploader_name) {
      return res.status(400).json({ error: "Photo and uploader name are required." });
    }

    const ext = path.extname(file.originalname);
    const s3Key = `photos/${Date.now()}-${file.originalname.replace(/\s/g, "_")}`;

    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: s3Key,
        Body: file.buffer,
        ContentType: file.mimetype,
      })
    );

    const s3Url = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
    const thumbnailUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/thumbnails/${path.basename(s3Key)}`;

    const db = await getDB();
    await db.execute(
      `INSERT INTO photos (uploader_name, original_filename, s3_key, s3_url, thumbnail_url, uploaded_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
      [uploader_name, file.originalname, s3Key, s3Url, thumbnailUrl]
    );
    await db.end();

    res.json({ message: "Photo uploaded successfully!", s3Url, thumbnailUrl });
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Upload failed. Check server logs." });
  }
});

// GET /photos
app.get("/photos", async (req, res) => {
  try {
    const db = await getDB();
    const [rows] = await db.execute(
      `SELECT id, uploader_name, original_filename, s3_url, thumbnail_url, uploaded_at
       FROM photos ORDER BY uploaded_at DESC`
    );
    await db.end();
    res.json(rows);
  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).json({ error: "Failed to fetch photos." });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`SnapGram server running on port ${PORT}`));
