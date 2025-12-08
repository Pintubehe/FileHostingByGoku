import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const tmpDir = '/tmp';
    const files = [];
    
    // Read /tmp directory
    const fileNames = fs.readdirSync(tmpDir);
    
    fileNames.forEach(fileName => {
      const filePath = path.join(tmpDir, fileName);
      const stats = fs.statSync(filePath);
      
      if (stats.isFile()) {
        files.push({
          id: fileName,
          name: fileName, // In real app, get original name from DB
          size: stats.size,
          uploaded_at: stats.ctime,
          type: path.extname(fileName),
        });
      }
    });

    res.status(200).json({
      success: true,
      files: files,
      count: files.length,
    });
  } catch (error) {
    console.error('Error reading files:', error);
    res.status(500).json({ error: error.message });
  }
}
