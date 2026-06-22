const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
    });
}

const targetDir = 'c:/Projects/CDNT-admin-panel/src';
let changedFiles = 0;

walkDir(targetDir, function(filePath) {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts')) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // 1. Fix non-existent colors that fall back to nothing (too light)
    content = content.replace(/text-gray-650/g, 'text-gray-700');
    content = content.replace(/text-gray-550/g, 'text-gray-600');
    content = content.replace(/text-gray-450/g, 'text-gray-500');

    // 2. Fix text-gray-400 which is generally too light for text on white backgrounds.
    // Increase to text-gray-500. We use regex to ignore placeholder:text-gray-400 
    // or group-hover:text-gray-400 etc. Actually, even group-hover:text-gray-400 should probably be 500.
    // Let's replace all `text-gray-400` with `text-gray-500` except `placeholder:text-gray-400`
    // and `border-gray-400` (which doesn't match text anyway).
    // Lookbehind is supported in modern Node.js
    content = content.replace(/(?<!placeholder:)text-gray-400/g, 'text-gray-500');
    
    // Also, if placeholder text is "too faint", maybe the placeholders should be gray-500 too?
    // User said: "Placeholder text is being used as actual display text (inheriting gray color)"
    // This could mean they literally used something like `text-gray-400` for display text.
    // It could also mean they want placeholders to be more visible. Let's make placeholders gray-500 just in case.
    content = content.replace(/placeholder:text-gray-400/g, 'placeholder:text-gray-500');
    content = content.replace(/placeholder:text-gray-300/g, 'placeholder:text-gray-400');

    // 3. Table cell text colors. Usually standard table cells are `text-gray-500` or `text-gray-600`.
    // Let's bump `text-gray-500` to `text-gray-600` inside `td` if any?
    // Actually, `text-gray-500` is WCAG AA compliant on white for large text, but `text-gray-600` is much better for small text (`text-xs`).
    // A lot of the text is `text-xs text-gray-500`. Let's bump `text-gray-500` to `text-gray-600` globally for better contrast,
    // since the whole app seems to suffer from low contrast.
    content = content.replace(/(?<!placeholder:)text-gray-500/g, 'text-gray-600');
    content = content.replace(/placeholder:text-gray-500/g, 'placeholder:text-gray-500'); // already 500, but if original was 500 we can leave it.

    // 4. Sidebar inactive link colors: 
    // Wait, Sidebar used `text-gray-600` for inactive links. If we bumped `500` to `600`, we might bump `600` to `700`?
    // Let's leave `text-gray-600` alone for now, except Sidebar specifically.
    // But `text-gray-500` became `text-gray-600`. So it will all match nicely.

    // 5. Fix badge/pill text contrast: e.g. `bg-gray-100 text-gray-400` might have been bumped to `text-gray-500`
    // Let's also bump any `bg-gray-50 text-gray-400` -> `text-gray-600`.

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log('- Fixed contrast in', path.relative(targetDir, filePath));
        changedFiles++;
    }
});

console.log(`\nCompleted contrast updates across ${changedFiles} files.`);
