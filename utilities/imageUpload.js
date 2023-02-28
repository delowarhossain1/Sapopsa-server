const uploadImg = (file, dir, cb) => {

    file.mv(dir, async (err) => {
        if (err) {
            res.send({ message: 'Unable file upload' });
        }
        else {
            cb();
        }
    });

}


module.exports = uploadImg;