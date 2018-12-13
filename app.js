const express = require('express');
const app = express();
const fs = require('fs');

app.use(express.json());

app.use(function(req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});

app.get('/filemanager/list', (req, res) => {
    let path = req.query.path || '/';
    fs.readdir(path, function(err, items) {

        return res.json((items && items.length && items || []).map(f => {
            const fpath = path + '/' + f;
            let type = 'file';
            try {
                type = fs.statSync(fpath).isDirectory() ? 'dir' : type;
            } catch (err) {

            }
            return {
                name: f,
                type: type
            }
        }));
    });
});


app.post('/filemanager/dir/create', (req, res) => {

    const fullPath = req.body.path + '/' + req.body.directory;
    
    let result = false;
    if (!fs.existsSync(fullPath)){
        result = fs.mkdirSync(fullPath);
        return res.json(result || true);
    }
    
});


app.get('/filemanager/file/content', (req, res) => {
    let path = req.query.path;
    return res.download(path);
});


app.post('/filemanager/file/remove', (req, res) => {
    const { path, filenames, recursive } = req.body;

    const promises = (filenames || []).map(f => {
        const fullPath = path + '/' + f;
        console.log(fullPath);
        return new Promise((resolve, reject) => {
            fs.unlink(fullPath, err => {
                if (err) {
                    return reject({
                        success: false,
                        error: err,
                        path,
                        filename: f,
                        fullPath
                    });
                }
                return resolve({
                    success: true,
                    error: null,
                    path,
                    filename: f,
                    fullPath
                });
            });
        });
    });

    Promise.all(promises).then(values => {
        res.json({
            success: true,
            result: values
        });
    }).catch(values => {
        res.status(500).json({
            success: false,
            errorMsg: 'An error ocurred deleting file',
            error: values,
        });
    });
    
});

app.listen(8000);
