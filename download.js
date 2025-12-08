import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  const { id } = req.query;
  
  // Security check - prevent directory traversal
  if (!id || id.includes('..') || id.includes('/')) {
    return res.status(400).json({ error: 'Invalid file ID' });
  }

  const filePath = path.join('/tmp', id);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  // In a real app, get filename from database
  const filename = id; // You should get actual filename from DB
  
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/octet-stream');
  
  const fileStream = fs.createReadStream(filePath);
  fileStream.pipe(res);
}
