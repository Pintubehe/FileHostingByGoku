export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method === 'POST') {
    // Simple file upload
    const chunks = [];
    
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    
    const buffer = Buffer.concat(chunks);
    
    res.status(200).json({
      success: true,
      message: 'File received',
      size: buffer.length,
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
