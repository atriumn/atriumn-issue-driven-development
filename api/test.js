// Simple test endpoint to verify Vercel is working
module.exports = (req, res) => {
  res.status(200).json({ 
    message: 'Vercel is working!',
    timestamp: new Date().toISOString(),
    path: req.url,
    method: req.method
  });
};