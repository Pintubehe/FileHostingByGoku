import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI;
let cachedClient = null;

async function connectToDatabase() {
  if (cachedClient) {
    return cachedClient;
  }
  
  const client = await MongoClient.connect(MONGODB_URI);
  cachedClient = client;
  return client;
}

export default async function handler(req, res) {
  try {
    const client = await connectToDatabase();
    const db = client.db('filehost');
    
    // Get query parameters
    const { page = 1, limit = 10, search = '' } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build query
    let query = {};
    if (search) {
      query.filename = { $regex: search, $options: 'i' };
    }
    
    // Get files with pagination
    const files = await db.collection('files')
      .find(query)
      .sort({ uploaded_at: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();
    
    // Get total count
    const total = await db.collection('files').countDocuments(query);
    
    // Get stats
    const stats = await db.collection('files').aggregate([
      { $group: {
        _id: null,
        total: { $sum: 1 },
        totalSize: { $sum: "$size" },
        averageSize: { $avg: "$size" }
      }}
    ]).toArray();
    
    // Clean up data (remove file data)
    const cleanFiles = files.map(file => ({
      _id: file._id,
      filename: file.filename,
      size: file.size,
      filetype: file.filetype,
      uploaded_at: file.uploaded_at,
      downloads: file.downloads,
      expires_at: file.expires_at
    }));
    
    res.status(200).json({
      success: true,
      files: cleanFiles,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      stats: stats[0] || { total: 0, totalSize: 0, averageSize: 0 }
    });
    
  } catch (error) {
    console.error('Files error:', error);
    res.status(500).json({ error: error.message });
  }
}
