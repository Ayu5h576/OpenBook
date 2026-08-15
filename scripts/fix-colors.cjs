const fs = require('fs');
const path = require('path');

const replacements = {
  '\\[#F8F6F1\\]': '[var(--bg-ivory)]',
  '\\[#EFE8DD\\]': '[var(--bg-beige)]',
  '\\[#1D1D1D\\]': '[var(--ink)]',
  '\\[#777777\\]': '[var(--muted)]',
  '\\[#FFFFFF\\]': '[var(--white)]',
  '\\[#E5E0D8\\]': '[var(--border-light)]'
};

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      
      for (const [hex, cssVar] of Object.entries(replacements)) {
        const regex = new RegExp(hex, 'gi');
        if (regex.test(content)) {
          content = content.replace(regex, cssVar);
          changed = true;
        }
      }
      
      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Updated:', fullPath);
      }
    }
  }
}

console.log('Replacing hex codes with CSS variables...');
walk('src');
console.log('Done!');
