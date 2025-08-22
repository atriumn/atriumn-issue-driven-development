// Script to generate GitHub App installation token
const jwt = require('jsonwebtoken');
const https = require('https');

function generateJWT(appId, privateKey) {
  const payload = {
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60,
    iss: appId
  };
  return jwt.sign(payload, privateKey, { algorithm: 'RS256' });
}

async function getInstallationToken(appId, privateKey, installationId) {
  const jwtToken = generateJWT(appId, privateKey);
  
  const options = {
    hostname: 'api.github.com',
    path: `/app/installations/${installationId}/access_tokens`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Atriumn-Pipeline'
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        const response = JSON.parse(data);
        resolve(response.token);
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// Usage in GitHub Action:
// const token = await getInstallationToken(
//   process.env.APP_ID,
//   process.env.PRIVATE_KEY,
//   process.env.INSTALLATION_ID
// );
// Then use this token for checkout and push