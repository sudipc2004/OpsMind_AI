import { useState, useRef } from 'react';

/**
 * AdminUpload — sidebar panel for PDF ingestion.
 * Props: onDocAdded(docInfo)
 */
export default function AdminUpload({ onDocAdded, docs }) {
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success'|'error', msg }
  const inputRef = useRef(null);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 5000);
  };

  const handleFile = (f) => {
    if (!f) return;
    if (f.type !== 'application/pdf') {
      showToast('error', 'Only PDF files are supported.');
      return;
    }
    setFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setToast(null);

    const formData = new FormData();
    formData.append('pdf', file);

    try {
      const token = localStorage.getItem('opsmind_token');
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      let data = {};
      try {
        data = await res.json();
      } catch (e) {
        // Fallback for non-JSON or empty responses
      }

      if (!res.ok) throw new Error(data.error || `Upload failed (${res.status})`);

      showToast('success', `✓ Indexed ${data.chunks} chunks from "${data.filename}"`);
      onDocAdded({ name: data.filename, pages: data.pages, chunks: data.chunks });
      setFile(null);
    } catch (err) {
      showToast('error', err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      {/* Upload Panel */}
      <div>
        <p className="text-[0.68rem] font-semibold tracking-[0.12em] uppercase text-text-muted px-1 mb-1">
          Upload SOP Document
        </p>
        <div className="bg-bg-glass border border-border-subtle rounded-md p-5 flex flex-col gap-3.5 backdrop-blur-md">
          {/* Dropzone */}
          <div
            className={`border-2 border-dashed rounded-sm py-7 px-4 text-center cursor-pointer transition-all duration-220 relative bg-[rgba(0,212,255,0.03)]
              ${dragOver ? 'border-brand-cyan bg-[rgba(0,212,255,0.08)] shadow-[0_0_20px_rgba(0,212,255,0.1)]' : 'border-[rgba(0,212,255,0.25)] hover:border-brand-cyan hover:bg-[rgba(0,212,255,0.08)] hover:shadow-[0_0_20px_rgba(0,212,255,0.1)]'}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFile(e.dataTransfer.files[0]);
            }}
          >
            <input
              ref={inputRef}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              type="file"
              accept="application/pdf"
              id="pdf-input"
              onChange={(e) => handleFile(e.target.files[0])}
            />
            <span className="text-[2.2rem] mb-2.5 block">📄</span>
            <p className="text-[0.82rem] font-semibold text-text-primary mb-1">Drop PDF or click to browse</p>
            <p className="text-[0.72rem] text-text-secondary">Max 50 MB · PDF only</p>
          </div>

          {/* Selected file */}
          {file && (
            <div className="flex items-center gap-2 bg-[rgba(0,212,255,0.08)] border border-[rgba(0,212,255,0.2)] rounded-sm py-2 px-3 text-[0.78rem] font-mono text-brand-cyan break-all">
              <span className="shrink-0">📎</span>
              <span>{file.name}</span>
            </div>
          )}

          {/* Progress */}
          {uploading && (
            <div className="h-1 bg-[rgba(255,255,255,0.06)] rounded-sm overflow-hidden">
              <div className="h-full bg-gradient-to-br from-brand-cyan to-brand-purple rounded-sm animate-progress-anim w-[40%]" />
            </div>
          )}

          {/* Upload button */}
          <button
            id="upload-btn"
            className="w-full py-2.5 rounded-sm bg-gradient-to-br from-brand-cyan to-brand-purple border-none text-white font-sans text-[0.85rem] font-semibold cursor-pointer transition-all duration-220 relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 after:content-[''] after:absolute after:inset-0 after:bg-transparent after:transition-colors hover:not-disabled:after:bg-[rgba(255,255,255,0.1)]"
            onClick={handleUpload}
            disabled={!file || uploading}
          >
            {uploading ? 'Processing & Indexing…' : 'Upload & Index'}
          </button>

          {/* Toast */}
          {toast && (
            <div className={`text-[0.78rem] py-2.5 px-3 rounded-sm border leading-relaxed animate-fade-in-up mt-1
              ${toast.type === 'error'
                ? 'bg-[rgba(244,63,94,0.1)] border-[rgba(244,63,94,0.3)] text-brand-rose'
                : 'bg-[rgba(16,185,129,0.1)] border-[rgba(16,185,129,0.3)] text-brand-emerald'}`}>
              {toast.msg}
            </div>
          )}
        </div>
      </div>

      {/* Indexed documents */}
      <div>
        <p className="text-[0.68rem] font-semibold tracking-[0.12em] uppercase text-text-muted px-1 mb-1 mt-4">
          Indexed Documents{' '}
          {docs.length > 0 && (
            <span className="text-[0.65rem] font-bold px-2 py-0.5 rounded-full bg-[rgba(0,212,255,0.1)] text-brand-cyan border border-[rgba(0,212,255,0.2)] tracking-wider uppercase ml-1.5">{docs.length}</span>
          )}
        </p>
        <div className="flex flex-col gap-1.5 mt-2">
          {docs.length === 0 ? (
            <div className="text-center p-5 text-text-muted text-[0.78rem] border border-dashed border-border-subtle rounded-sm">
              No documents indexed yet
            </div>
          ) : (
            docs.map((doc, i) => (
              <div key={i} className="flex items-start gap-2.5 py-2.5 px-3 bg-bg-glass border border-border-subtle rounded-sm text-[0.78rem] transition-colors duration-220 hover:border-[rgba(139,92,246,0.35)]">
                <span className="text-[1.1rem] shrink-0 mt-[1px]">📋</span>
                <div>
                  <p className="font-semibold text-text-primary break-all leading-[1.4]">{doc.name}</p>
                  <p className="text-text-secondary text-[0.7rem] mt-0.5">{doc.pages} pages · {doc.chunks} chunks</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
