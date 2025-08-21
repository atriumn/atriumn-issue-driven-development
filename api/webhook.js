// Vercel serverless function handler for GitHub webhooks
module.exports = async (req, res) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('Webhook received:', req.headers['x-github-event']);
  
  // For now, just acknowledge receipt
  // The actual processing is failing due to module resolution issues
  return res.status(200).json({ 
    status: 'accepted',
    event: req.headers['x-github-event'],
    timestamp: new Date().toISOString()
  });
};