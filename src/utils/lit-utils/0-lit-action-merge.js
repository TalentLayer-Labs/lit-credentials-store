const fs = require('fs').promises;
const path = require('path');

async function mergeFiles(filePaths, outputFilePath) {
  try {
    const fileContents = await Promise.all(
      filePaths.map(filePath => fs.readFile(path.resolve(__dirname, filePath), 'utf8'))
    );
    const mergedContent = fileContents.join('\n');
    await fs.writeFile(path.resolve(__dirname, outputFilePath), mergedContent, 'utf8');
    return mergedContent;
  } catch (error) {
    console.error('Error reading or writing files:', error);
  }
}

(async () => {
  const filePaths = [
    './1-lit-action-utils.js', // utils to all files
    './2-lit-action-github.js', // the github integration
    // TODO: add new integrations here
    './9-lit-action-index.js', // the go()
  ];
  const outputFilePath = './out/lit-action-generated.js';
  await mergeFiles(filePaths, outputFilePath);
  console.log('LitAction files successfully merged to : ', outputFilePath, '\nYou can now upload it to IPFS!');
})();
