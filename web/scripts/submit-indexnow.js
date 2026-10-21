// IndexNow Instant Search Engine Indexing Submitter
// Submits URLs to Bing, Brave, Yandex, Seznam, and Yahoo

const https = require('https');

const host = 'www.syncinema.site';
const key = '8d4f2a1b9e7c3f5a0e6b8c4d2a1f9e7b';
const keyLocation = `https://${host}/${key}.txt`;

const urlList = [
  `https://${host}/`,
];

const payload = JSON.stringify({
  host,
  key,
  keyLocation,
  urlList,
});

function submit(endpointHost, endpointPath) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: endpointHost,
        path: endpointPath,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          console.log(`[IndexNow] ${endpointHost} responded with status: ${res.statusCode} ${body || '(OK)'}`);
          resolve({ status: res.statusCode, body });
        });
      }
    );

    req.on('error', (err) => {
      console.error(`[IndexNow] ${endpointHost} error:`, err.message);
      resolve({ status: 500, error: err.message });
    });

    req.write(payload);
    req.end();
  });
}

async function run() {
  console.log(`Submitting IndexNow for ${host} (${urlList.length} URLs)...`);
  await submit('api.indexnow.org', '/indexnow');
  await submit('www.bing.com', '/indexnow');
}

run();
