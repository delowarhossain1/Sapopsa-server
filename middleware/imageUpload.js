const multer = require('multer');
const path = require('path');

const upload_folder = '../uploads/';

const storage = multer.diskStorage({
    destination : (req, file, cb) => {
        cb(null, upload_folder);
    },
    filename : (req, file, cb) =>{
        const fileExt = path.extname(file.originalname);
        const fileName = file.originalname
                                .replace(fileExt, '')
                                .toLocaleLowerCase()
                                .split(" ")
                                .join("-") + "-" + Date.now();
        
        cb(null, fileName + fileExt);
    }
});

const update = multer({
    storage,

    fileFilter : (req, file, cb) => {
        if(
            file.mimetype === 'image/png' ||
            file.mimetype === 'image/jpg' ||
            file.mimetype === 'image/jpeg'
        ){
            cb(null, true);
        }
        else{
            cb(null, false);
        }
    }
});

module.exports = update;