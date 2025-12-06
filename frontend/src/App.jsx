import React, { useState, useRef } from 'react';
import axios from 'axios';
// lucide-react does not export DocumentText — use FileText and alias it.
import { Sparkles, FileText as DocumentText, Upload, X, CheckCircle } from 'lucide-react';

/**
 * Integrated Resume Screener App.jsx
 * - Uploads file to http://localhost:8000/parse-resume (field name: file)
 * - Supports PDF, DOC, DOCX
 * - Shows upload progress, result, highlights, score
 * - Uses Tailwind classes (assumes tailwind is configured)
 */

export default function ResumeScreener() {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const fileInputRef = useRef(null);

  // Accept PDF and Word docs
  const isAcceptable = (f) => {
    if (!f) return false;
    const name = f.name.toLowerCase();
    return (
      f.type === 'application/pdf' ||
      f.type === 'application/msword' ||
      f.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      name.endsWith('.pdf') || name.endsWith('.doc') || name.endsWith('.docx')
    );
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files && e.dataTransfer.files[0];
    if (droppedFile && isAcceptable(droppedFile)) {
      setFile(droppedFile);
      setResult(null);
    } else {
      alert('Please upload a PDF, DOC or DOCX file.');
    }
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files && e.target.files[0];
    if (selectedFile && isAcceptable(selectedFile)) {
      setFile(selectedFile);
      setResult(null);
    } else {
      alert('Please select a PDF, DOC or DOCX file.');
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setResult(null);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    let b = bytes;
    const thresh = 1024;
    if (Math.abs(b) < thresh) return b + ' B';
    const units = ['KB','MB','GB'];
    let u = -1;
    do { b /= thresh; ++u; } while (Math.abs(b) >= thresh && u < units.length - 1);
    return b.toFixed(1) + ' ' + units[u];
  };

  // Upload to backend parse endpoint
  const uploadAndScreen = async () => {
    if (!file) { alert('Choose a resume first'); return; }

    setIsUploading(true);
    setUploadProgress(0);
    setResult(null);

    try {
      const fd = new FormData();
      fd.append('file', file); // backend expects field "file"

      const resp = await axios.post('http://localhost:8000/parse-resume', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
        onUploadProgress: (ev) => {
          if (ev.total) {
            setUploadProgress(Math.round((ev.loaded * 100) / ev.total));
          }
        },
      });

      // map response to result shape (defensive)
      const data = resp.data || {};
      setResult({
        text: data.preview ?? data.text ?? '(no extracted text)',
        score: (typeof data.score === 'number') ? data.score : (data.score ? Number(data.score) : 0),
        highlights: data.highlights ?? data.skills ?? [],
        filename: data.filename ?? file.name,
      });
    } catch (err) {
      console.error('Upload error', err);
      if (err?.response) {
        alert(`Server error: ${err.response.status} ${err.response.statusText}`);
      } else if (err?.request) {
        alert('No response from server. Is the backend running on http://localhost:8000 ?');
      } else {
        alert('Upload failed: ' + err.message);
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'bg-green-600';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };
  const getScoreTextColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  // small helper to download report text
  const downloadReport = () => {
    if (!result) return;
    const blob = new Blob([`Filename: ${result.filename}\n\nScore: ${result.score}\n\n\nExtracted Text:\n\n${result.text}`], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${result.filename || 'resume'}-report.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Sparkles className="h-10 w-10 text-indigo-500" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Resume Screener</h1>
          <p className="text-lg text-gray-600">Upload a resume to extract skills, experience, and generate an automated screening score</p>
        </div>

        {/* Upload Card */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Upload Resume</h2>

          {!file ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 bg-gray-50'
              }`}
            >
              <DocumentText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-700 font-medium mb-2">Drag and drop your resume here</p>
              <p className="text-gray-500 text-sm mb-4">or</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center px-6 py-3 bg-indigo-500 text-white font-medium rounded-lg hover:bg-indigo-600 transition-colors"
              >
                <Upload className="h-5 w-5 mr-2" />
                Select File
              </button>
              <p className="text-gray-400 text-xs mt-4">Supports PDF, DOC, DOCX</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Selected File */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center flex-1 min-w-0">
                  <DocumentText className="h-8 w-8 text-indigo-500 flex-shrink-0" />
                  <div className="ml-3 min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRemoveFile}
                    className="p-1 hover:bg-gray-200 rounded-full transition-colors flex-shrink-0"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>
              </div>

              {/* Upload Progress */}
              {isUploading && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Processing...</span>
                    <span className="text-sm font-medium text-indigo-500">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Screen Button */}
              {!isUploading && !result && (
                <button
                  onClick={uploadAndScreen}
                  className="w-full py-3 bg-indigo-500 text-white font-medium rounded-lg hover:bg-indigo-600 transition-colors"
                >
                  Screen Resume
                </button>
              )}
            </div>
          )}
        </div>

        {/* Results Card */}
        {result && (
          <div className="bg-white rounded-xl shadow-md p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Screening Results</h2>
              <div className="flex items-center">
                <CheckCircle className="h-6 w-6 text-green-600 mr-2" />
                <span className="text-sm font-medium text-gray-600">Complete</span>
              </div>
            </div>

            {/* Score */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">Match Score</span>
                <span className={`text-2xl font-bold ${getScoreTextColor(result.score)}`}>
                  {result.score}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${getScoreColor(result.score)}`}
                  style={{ width: `${result.score}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {result.score >= 80 ? 'Excellent match for the position' :
                 result.score >= 60 ? 'Good match with some gaps' :
                 'Limited match for the position'}
              </p>
            </div>

            {/* Skills Highlights */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Key Skills Identified</h3>
              <div className="flex flex-wrap gap-2">
                {result.highlights.map((skill, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-indigo-100 text-indigo-700 text-sm font-medium rounded-full"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Extracted Text */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">Extracted Content</h3>
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-sm text-indigo-500 hover:text-indigo-600 font-medium"
                >
                  {isExpanded ? 'Collapse' : 'Expand'}
                </button>
              </div>
              <div
                className={`bg-gray-50 rounded-lg p-4 overflow-hidden transition-all ${
                  isExpanded ? 'max-h-96 overflow-y-auto' : 'max-h-32'
                }`}
              >
                <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
                  {result.text}
                </pre>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => { handleRemoveFile(); setResult(null); }}
                className="flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                Screen Another Resume
              </button>
              <button
                onClick={downloadReport}
                className="flex-1 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
              >
                Download Report
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
