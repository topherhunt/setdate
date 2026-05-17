const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

function createTestJpeg(dir, name) {
  const filePath = path.join(dir, name);
  execFileSync('python3', [
    '-c',
    `from PIL import Image; Image.new('RGB', (1, 1), (255, 0, 0)).save('${filePath}', 'JPEG')`,
  ]);
  return filePath;
}

module.exports = { createTestJpeg };
