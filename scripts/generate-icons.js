/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-unused-vars */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, '../public/icon-512.png');
const output192 = path.join(__dirname, '../public/icon-192.png');

sharp(inputFile)
    .resize(192, 192)
    .toFile(output192)
    .then(() => console.log('Generated icon-192.png'))
    .catch(err => console.error(err));
