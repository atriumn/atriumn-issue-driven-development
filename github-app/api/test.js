// Test endpoint to verify Vercel is working
module.exports = (req, res) => {
  res.status(200).json({ 
    message: 'Vercel is working from github-app/api!',
    timestamp: new Date().toISOString(),
    path: req.url,
    method: req.method
  });
};