export default function handler(req, res) {
  res.status(200).json({
    status: 'online',
    service: 'Vercel File Host',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    region: process.env.VERCEL_REGION || 'unknown',
  });
}
