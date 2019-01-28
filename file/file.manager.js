const fs = require('fs');
const path = require('path');

class FileManager {
    constructor() {
    }

    accessAsync (path) {
        return new Promise((resolve, reject) => {
            fs.access(path, fs.constants.F_OK, (err) => {
                resolve(!err);
            })
        })
    }


    readFileAsync (path, opts = 'utf8') {
        return new Promise((resolve, reject) => {
            fs.readFile(path, opts, (err, data) => {
                if (err) reject(err);
                else resolve(data);
            })
        })
    }

    writeFileAsync (path, data, opts = 'utf8') {
        return new Promise((resolve, reject) => {
            fs.writeFile(path, data, opts, (err) => {
                if (err) reject(err);
                else resolve();
            })
        })
    }
}

exports.FileManager = new FileManager();
