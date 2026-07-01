CREATE DATABASE IF NOT EXISTS snapgram;
USE snapgram;

CREATE TABLE IF NOT EXISTS photos (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  uploader_name   VARCHAR(100)  NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  s3_key          VARCHAR(500)  NOT NULL,
  s3_url          TEXT          NOT NULL,
  thumbnail_url   TEXT          NOT NULL,
  uploaded_at     DATETIME      NOT NULL
);
