# SnapGram

A photo sharing demo app built on AWS — showcasing EC2, S3, RDS, and Lambda working together.

---

## Project Structure

```
snapgram/
├── client/          # React frontend (Vite)
├── server/          # Node.js + Express backend
│   ├── index.js
│   ├── schema.sql
│   ├── .env.example
│   └── package.json
└── lambda/
    └── resize.py    # AWS Lambda function (auto thumbnail generation)
```

---

## AWS Services Used

| Service | Role |
|---------|------|
| EC2 | Hosts and runs the backend server |
| S3 | Stores uploaded photos and thumbnails |
| RDS (MySQL) | Stores photo metadata — uploader name, S3 URL, timestamp |
| Lambda | Auto-triggered on S3 upload — resizes photo into a thumbnail |

---

## Setup Instructions

### 1. Clone the repo and set up the server

```bash
cd server
cp .env.example .env
# Fill in your AWS credentials and RDS details in .env
npm install
```

### 2. Set up the database

Connect to your RDS instance and run:

```bash
mysql -h your-rds-endpoint -u admin -p < schema.sql
```

### 3. Run the backend

```bash
cd server
npm start
# Server runs on port 4000
```

### 4. Run the frontend (development)

```bash
cd client
npm install
npm run dev
# Frontend runs on port 5173
```

### 5. Deploy Lambda

- Go to AWS Lambda → Create function → Python 3.11
- Paste the contents of `lambda/resize.py`
- Add a layer with the Pillow library (use an AWS-provided layer or upload manually)
- Add an S3 trigger: bucket = snapgram-photos, event = ObjectCreated, prefix = photos/
- Give the Lambda function an IAM role with S3 read/write permissions

---

## .env Reference

```
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=your_key
AWS_SECRET_ACCESS_KEY=your_secret
S3_BUCKET_NAME=snapgram-photos
DB_HOST=your-rds-endpoint.rds.amazonaws.com
DB_USER=admin
DB_PASSWORD=your_password
DB_NAME=snapgram
PORT=4000
```

---

## How it works (the full flow)

1. User fills in their name and picks a photo on the React frontend
2. Frontend sends a POST /upload request to the Express backend on EC2
3. EC2 uploads the original photo to S3 under the `photos/` prefix
4. EC2 saves a record to RDS: uploader name, S3 URL, thumbnail URL, timestamp
5. S3 triggers the Lambda function automatically
6. Lambda downloads the photo, resizes it to 400×400, saves it to `thumbnails/` in S3
7. The gallery fetches all records from RDS via GET /photos and renders thumbnails from S3
8. Clicking a thumbnail opens the full-size photo from S3
