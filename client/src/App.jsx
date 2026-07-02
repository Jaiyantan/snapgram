import { useState, useEffect, useRef } from "react";

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  }) + " at " + d.toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });
}

export default function App() {
  const [photos, setPhotos]         = useState([]);
  const [uploaderName, setUploaderName] = useState("");
  const [file, setFile]             = useState(null);
  const [fileName, setFileName]     = useState("Choose a photo");
  const [status, setStatus]         = useState(null);
  const [uploading, setUploading]   = useState(false);
  const [lightbox, setLightbox]     = useState(null);
  const fileRef = useRef();

  async function fetchPhotos() {
    try {
      const res = await fetch("http://34.235.140.175:4000/photos");
      const data = await res.json();
      setPhotos(data);
    } catch {
      console.error("Failed to fetch photos");
    }
  }

  useEffect(() => { fetchPhotos(); }, []);

  function handleFile(e) {
    const f = e.target.files[0];
    if (f) { setFile(f); setFileName(f.name); }
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!uploaderName.trim() || !file) {
      setStatus({ type: "error", msg: "Please enter your name and choose a photo." });
      return;
    }
    setUploading(true);
    setStatus({ type: "loading", msg: "Uploading to S3 via EC2..." });

    const form = new FormData();
    form.append("uploader_name", uploaderName.trim());
    form.append("photo", file);

    try {
      const res = await fetch("http://34.235.140.175:4000/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStatus({ type: "success", msg: "Uploaded! Lambda will generate the thumbnail shortly." });
      setFile(null);
      setFileName("Choose a photo");
      setUploaderName("");
      if (fileRef.current) fileRef.current.value = "";
      fetchPhotos();
    } catch (err) {
      setStatus({ type: "error", msg: err.message || "Upload failed." });
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      {lightbox && (
        <div className="lightbox-overlay" onClick={() => setLightbox(null)}>
          <button className="lightbox-close" onClick={() => setLightbox(null)}>×</button>
          <img src={lightbox} alt="Full size" onClick={e => e.stopPropagation()} />
        </div>
      )}

      <header>
        <h1>SnapGram</h1>
        <span>Powered by AWS</span>
      </header>

      <main>
        <div className="aws-badge-row">
          <span className="aws-badge badge-ec2">EC2 — compute</span>
          <span className="aws-badge badge-s3">S3 — storage</span>
          <span className="aws-badge badge-rds">RDS — database</span>
          <span className="aws-badge badge-lambda">Lambda — auto thumbnail</span>
        </div>

        <div className="upload-card">
          <h2>Share a photo</h2>
          <form onSubmit={handleUpload}>
            <div className="form-row">
              <div className="form-group">
                <label>Your name</label>
                <input
                  type="text"
                  placeholder="e.g. Ravi Kumar"
                  value={uploaderName}
                  onChange={e => setUploaderName(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Photo</label>
                <label className="file-label">
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileRef}
                    onChange={handleFile}
                  />
                  📷 {fileName}
                </label>
              </div>
              <button className="upload-btn" type="submit" disabled={uploading}>
                {uploading ? "Uploading..." : "Upload"}
              </button>
            </div>
            {status && (
              <div className={`status-msg ${status.type}`}>{status.msg}</div>
            )}
          </form>
        </div>

        <div className="gallery-header">
          <h2>Gallery</h2>
          <span className="photo-count">{photos.length} photo{photos.length !== 1 ? "s" : ""}</span>
        </div>

        {photos.length === 0 ? (
          <div className="empty-state">
            <p>📷</p>
            <p>No photos yet. Be the first to upload!</p>
          </div>
        ) : (
          <div className="gallery-grid">
            {photos.map(photo => (
              <div className="photo-card" key={photo.id}>
                <img
                  src={photo.thumbnail_url}
                  alt={photo.original_filename}
                  onClick={() => setLightbox(photo.s3_url)}
                  onError={e => { e.target.src = photo.s3_url; }}
                />
                <div className="photo-info">
                  <div className="photo-uploader">{photo.uploader_name}</div>
                  <div className="photo-meta">
                    <span className="photo-timestamp">
                      {formatDate(photo.uploaded_at)}
                    </span>
                    <span className="photo-badge">thumbnail by Lambda</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
