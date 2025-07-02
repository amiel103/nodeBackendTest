const path = require('path');
const crypto = require('crypto'); 
const db = require('../config/db');
const fs = require('fs');

require('dotenv').config();
const UPLOADS_DIR = path.join('.', process.env.FOLDER);
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);


exports.uploadFile = async (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    const filePath = req.file.path;
    const fileName = req.file.filename;
    const fileBuffer = fs.readFileSync(filePath);

    const { data, error } = await supabase.storage
        .from('product-images') 
        .upload(`uploads/${fileName}`, fileBuffer, {
            contentType: req.file.mimetype,
            upsert: false
    });

    // const fileUrl = `${req.protocol}://${req.get('host')}/files/${req.file.filename}`;

    // create keys
    const publicKey = crypto.randomBytes(16).toString('hex');
    const privateKey = crypto.randomBytes(32).toString('hex');

    try {

        await db.query(
            `INSERT INTO files (public_key, private_key, filename, original_name, mime_type)
             VALUES ($1, $2, $3, $4, $5)`,
            [publicKey, privateKey, req.file.filename, req.file.originalname, req.file.mimetype]
        );

        res.status(200).json({
            message: 'File uploaded successfully',
            publicKey,
            privateKey
        });

    } catch (err) {

        console.error(err);
        res.status(500).json({ 
            error: 'Database error while saving file info.' 
        });

    }
};

exports.getFile =  async (req, res) => {
    const { publicKey } = req.params;

    // console.log('public key',publicKey)

    try {
        // Get file info from DB
        const result = await db.query(
            `SELECT filename, original_name, mime_type FROM files WHERE public_key = $1`,
            [publicKey]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'File not found.' });
        }

        const file = result.rows[0];
        const filePath = path.join(UPLOADS_DIR, file.filename); 

        // Check if file actually exists on disk
        if (!fs.existsSync(filePath)) {
            return res.status(410).json({ 
                error: 'File no longer exists on server.' 
            });
        }

        res.setHeader('Content-Type', file.mime_type);
        res.setHeader('Content-Disposition', `attachment; filename="${file.original_name}"`);

        // Stream file
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);

        fileStream.on('error', (err) => {
            console.error('Error streaming file:', err);
            res.status(500).end('Error reading file.');
        });

    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ 
            error: 'Internal server error.' 
        });
    }
};

exports.deleteFile = async (req, res) => {
    const { privateKey } = req.params;

    try {
        // Look up file by private key
        const result = await db.query(
            `SELECT filename FROM files WHERE private_key = $1`,
            [privateKey]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                error: 'File not found.' 
            });
        }

        const { filename } = result.rows[0];
        const filePath = path.join(UPLOADS_DIR, filename); 

        // Delete the file from disk if it exists
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Delete the entry from the database
        await db.query(`DELETE FROM files WHERE private_key = $1`, [privateKey]);

        res.status(200).json({ 
            message: 'File deleted successfully.' 
        });

    } catch (err) {
        console.error('Error deleting file:', err);
        res.status(500).json({ 
            error: 'Internal server error.' 
        });
    }
};



exports.cronDelete = () => {
    const FILE_TTL_MINUTES = 60; //time to live in minutes
    const now = Date.now();
    const ttlMs = FILE_TTL_MINUTES * 60 * 1000;
  
    fs.readdir(UPLOADS_DIR, (err, files) => {
      if (err){
        return console.error('Error reading upload dir:', err);
      }
  
      files.forEach(file => {
        const filePath = path.join(UPLOADS_DIR, file);

        fs.stat(filePath, (err, stats) => {
          if (err){
            return console.error('Error stating file:', err);
          } 
  
          const lastAccess = new Date(stats.atime).getTime();
          if (now - lastAccess > ttlMs) {
            fs.unlink(filePath, err => {

              if (err) console.error('Error deleting file:', file, err);
              else console.log('Deleted inactive file:', file);

            });
          }
        });
      });
    });
}