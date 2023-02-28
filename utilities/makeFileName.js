const path = require('path');

function makeFileName(fName = 'file name') {
    const extName = path.extname(fName);

    const fileName = fName
                    .replace(extName, '')
                    .toLowerCase()
                    .split(' ')
                    .join('-') + '-' + Date.now() + extName;

    return fileName;
}

module.exports = makeFileName;