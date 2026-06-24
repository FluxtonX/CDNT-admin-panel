const http = require('http');

http.get('http://localhost:3000/api/debug', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('Keys:', parsed.data ? Object.keys(parsed.data[0]) : parsed);
    } catch (e) {
      console.log('Parse error', data);
    }
  });
}).on('error', err => console.log('Error: ', err.message));
