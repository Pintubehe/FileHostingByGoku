import { MongoClient } from 'mongodb';

// MongoDB Connection
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
    
    // Check if connected
    await db.command({ ping: 1 });
    
    // Get stats
    const filesCount = await db.collection('files').countDocuments();
    const totalSize = await db.collection('files').aggregate([
      { $group: { _id: null, total: { $sum: "$size" } } }
    ]).toArray();
    
    res.status(200).json({
      status: 'online',
      mongodb: 'connected',
      dbName: 'filehost',
      uptime: process.uptime(),
      stats: {
        files: filesCount,
        totalSize: totalSize[0]?.total || 0
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      mongodb: 'disconnected',
      error: error.message
    });
  }
}
