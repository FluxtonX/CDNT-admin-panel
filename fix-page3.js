const fs = require('fs');
const lines = fs.readFileSync('src/app/(dashboard)/dashboard/users/[id]/page.tsx', 'utf-8').split('\n');

// Keep lines 0 to 749 (which correspond to lines 1 to 750 in 1-based indexing)
// Keep lines 894 to end (which correspond to lines 895 to end in 1-based indexing)
const newLines = [...lines.slice(0, 750), ...lines.slice(894)];

fs.writeFileSync('src/app/(dashboard)/dashboard/users/[id]/page.tsx', newLines.join('\n'));
console.log('Fixed lines!');
