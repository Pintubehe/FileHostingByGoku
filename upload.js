export const config = {
  api: {
    bodyParser: false,
  },
};

import { IncomingForm } from 'formidable';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

// Vercel serverless function
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse form data
    const form = new IncomingForm({
      uploadDir: '/tmp',
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
    });

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve([fields, files]);
      });
    });

    const file = files.file;
    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Generate unique filename
    const originalName = file.originalFilename;
    const extension = path.extname(originalName);
    const uniqueName = `${uuidv4()}${extension}`;
    const tempPath = file.filepath;
    
    // In Vercel, we can store in /tmp (temporary storage)
    // For persistent storage, you'd need a database or S3
    const finalPath = path.join('/tmp', uniqueName);
    
    // Move file
    fs.renameSync(tempPath, finalPath);

    // Store file info (in production, use a database)
    const fileInfo = {
      id: uniqueName,
      name: originalName,
      size: file.size,
      type: file.mimetype,
      uploaded_at: new Date().toISOString(),
      path: finalPath,
    };

    // In production, save to database here
    // For demo, we'll just return the info

    res.status(200).json({
      success: true,
      file: fileInfo,
      message: 'File uploaded successfully',
      downloadUrl: `/api/download/${uniqueName}`,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
}
