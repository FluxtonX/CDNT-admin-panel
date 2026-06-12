const fs = require('fs');
const path = require('path');

function searchDir(dir, query) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.next' && file !== '.git') {
        searchDir(fullPath, query);
      }
    } else if (stat.isFile()) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.toLowerCase().includes(query.toLowerCase())) {
        console.log(`Found match in: ${fullPath}`);
      }
    }
  }
}

searchDir(path.join(__dirname, 'src'), '0A3D91');
searchDir(path.join(__dirname, 'src'), '1650AB');
