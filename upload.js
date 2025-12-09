import { MongoClient } from 'mongodb';
import { Readable } from 'stream';
import { v4 as uuidv4 } from 'uuid';

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

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const client = await connectToDatabase();
    const db = client.db('filehost');
    
    // Parse multipart form data
    const chunks = [];
    for await (const chunk of req.body) {
      chunks.push(chunk);
    }
    
    const buffer = Buffer.concat(chunks);
    const boundary = req.headers['content-type'].split('boundary=')[1];
    const parts = parseMultipart(buffer, boundary);
    
    if (!parts.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const file = parts.file;
    const filename = parts.filename || file.filename;
    const size = parseInt(parts.size || file.size);
    
    // Generate unique ID
    const fileId = uuidv4();
    
    // Insert file metadata into MongoDB
    const fileData = {
      _id: fileId,
      filename: filename,
      originalName: file.filename,
      size: size,
      filetype: file.contentType,
      uploaded_at: new Date().toISOString(),
      downloads: 0,
      expires_at: parts.expires_at ? new Date(parts.expires_at) : null,
      data: file.data.toString('base64') // Store file as base64
    };
    
    await db.collection('files').insertOne(fileData);
    
    res.status(200).json({
      success: true,
      fileId: fileId,
      filename: filename,
      size: size,
      url: `/api/download/${fileId}`,
      message: 'File uploaded successfully to MongoDB'
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
}

// Helper function to parse multipart form data
function parseMultipart(buffer, boundary) {
  const parts = {};
  const boundaryBuffer = Buffer.from(`--${boundary}`);
  const endBoundaryBuffer = Buffer.from(`--${boundary}--`);
  
  let start = buffer.indexOf(boundaryBuffer) + boundaryBuffer.length;
  
  while (start < buffer.length) {
    // Find next boundary
    let end = buffer.indexOf(boundaryBuffer, start);
    if (end === -1) {
      end = buffer.indexOf(endBoundaryBuffer, start);
      if (end === -1) break;
    }
    
    const part = buffer.slice(start, end);
    
    // Parse headers
    const headerEnd = part.indexOf('\r\n\r\n');
    const headers = part.slice(0, headerEnd).toString();
    const body = part.slice(headerEnd + 4);
    
    // Extract content-disposition
    const nameMatch = headers.match(/name="([^"]+)"/);
    const filenameMatch = headers.match(/filename="([^"]+)"/);
    const contentTypeMatch = headers.match(/Content-Type:\s*([^\r\n]+)/);
    
    if (nameMatch) {
      const name = nameMatch[1];
      if (filenameMatch) {
        // It's a file
        parts[name] = {
          filename: filenameMatch[1],
          contentType: contentTypeMatch ? contentTypeMatch[1].trim() : 'application/octet-stream',
          data: body
        };
      } else {
        // It's a field
        parts[name] = body.toString().trim();
      }
    }
    
    start = end + boundaryBuffer.length;
  }
  
  return parts;
}
