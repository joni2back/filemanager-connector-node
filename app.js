const express = require('express');
const app = express();
const fs = require('fs');
var multer = require('multer')

app.use(express.json());

const apiResponse = (res, status = 200) =>
  (data, success = true, errorMsg = null, error = null) =>
    res.status(status).json({
      data,
      success,
      errorMsg,
      error,
    });

const apiError = (res, status = 500) =>
  (errorMsg = null, error = null) =>
    apiResponse(res, status)(null, false, errorMsg, error);

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,path');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
  res.setHeader('Access-Control-Allow-Credentials', true);
  next();
});

app.get('/filemanager/list', (req, res) => {
  const path = req.query.path || '.';

  fs.readdir(path, (err, files) => {
    if (err) {
      return apiError(res)('Cannot read that folder', err);
    }

    const items = (files || []).map((f) => {
      const fpath = `${path}/${f}`;
      let type = 'file';
      let size = 0;
      let createdAt = null;
      let updatedAt = null;
      try {
        const stat = fs.statSync(fpath);
        type = stat.isDirectory() ? 'dir' : type;
        size = stat.size || size;
        createdAt = stat.birthtimeMs;
        updatedAt = stat.mtimeMs;
      } catch (e) {
        return null;
      }
      return {
        name: f,
        path: fpath,
        type,
        size,
        createdAt,
        updatedAt,
      };
    }).filter(Boolean);

    return apiResponse(res)(items);
  });
});


app.post('/filemanager/dir/create', (req, res) => {
  const fullPath = `${req.body.path}/${req.body.directory}`;

  if (fs.existsSync(fullPath)) {
    return apiError(res)('The folder already exist');
  }
  try {
    const result = fs.mkdirSync(fullPath);
    return apiResponse(res)(result);
  } catch (err) {
    return apiError(res)('Unknown error creating folder', err);
  }
});


app.get('/filemanager/file/content', (req, res) =>
  res.download(req.query.path));


app.post('/filemanager/items/copy', (req, res) => {
  const {
    path,
    filenames,
    destination,
  } = req.body;

  const promises = (filenames || []).map(f =>
    new Promise((resolve, reject) => {
      const oldPath = `${path}/${f}`;
      const newPath = `${destination}/${f}`;
      fs.copyFile(oldPath, newPath, (err) => {
        const response = {
          success: !err,
          error: err,
          oldPath,
          newPath,
          filename: f,
        };
        return err ? reject(response) : resolve(response);
      });
    }));

  Promise.all(promises)
    .then(values => apiResponse(res)(values))
    .catch(err => apiError(res)('An error ocurred copying files', err));
});

app.post('/filemanager/items/move', (req, res) => {
  const {
    path,
    filenames,
    destination,
  } = req.body;

  const promises = (filenames || []).map(f =>
    new Promise((resolve, reject) => {
      const oldPath = `${path}/${f}`;
      const newPath = `${destination}/${f}`;
      fs.rename(oldPath, newPath, (err) => {
        const response = {
          success: !err,
          error: err,
          oldPath,
          newPath,
          filename: f,
        };
        return err ? reject(response) : resolve(response);
      });
    }));

  Promise.all(promises)
    .then(values => apiResponse(res)(values))
    .catch(err => apiError(res)('An error ocurred moving files', err));
});

app.post('/filemanager/item/move', (req, res) => {
  const {
    path,
    destination,
  } = req.body;

  const promise = new Promise((resolve, reject) =>
    fs.rename(path, destination, (err) => {
      const response = {
        success: !err,
        error: err,
        path,
        destination,
      };
      return err ? reject(response) : resolve(response);
    }));

  promise
    .then(values => apiResponse(res)(values))
    .catch(err => apiError(res)('An error ocurred renaming file', err));
});

app.post('/filemanager/items/upload', (req, res) => {
  const upload = multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => cb(null, req.headers.path),
      filename: (req, file, cb) => cb(null, file.originalname),
    }),
  }).array('file[]');

  upload((req, res, err) => {
    if (err) {
      return apiError(res)('An error occurred uploading files', err);
    }
    if (!req.files.length) {
      return apiError(res)('Cannot find any file to upload');
    }
    return apiResponse(res)(true);
  });
});

app.post('/filemanager/items/remove', (req, res) => {
  const {
    path,
    filenames,
  } = req.body;
  const promises = (filenames || []).map((f) => {
    const fullPath = `${path}/${f}`;
    return new Promise((resolve, reject) => {
      fs.unlink(fullPath, (err) => {
        const response = {
          success: !err,
          error: err,
          path,
          filename: f,
          fullPath,
        };
        return err ? reject(response) : resolve(response);
      });
    });
  });

  Promise.all(promises)
    .then(values => apiResponse(res)(values))
    .catch(err => apiError(res)('An error ocurred deleting file', err));
});

app.listen(8000);
