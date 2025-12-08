import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  
  if (!id || id.includes('..') || id.includes('/')) {
    return res.status(400).json({ error: 'Invalid file ID' });
  }

  const filePath = path.join('/tmp', id);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  try {
    fs.unlinkSync(filePath);
    res.status(200).json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
