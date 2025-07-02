const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();



require('dotenv').config();
const UPLOADS_DIR = path.join('.', process.env.FOLDER);

const fileController = require('../controllers/fileController');


// Configure Multer for file uploads
const storage = multer.diskStorage({

    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR)
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname)
    }

});
const upload = multer({ storage });

router.post('/', upload.single('file'), fileController.uploadFile);
router.get('/:publicKey', fileController.getFile);
router.delete('/:privateKey', fileController.deleteFile);


// Serve files
router.use('/files', express.static(UPLOADS_DIR));

module.exports = router