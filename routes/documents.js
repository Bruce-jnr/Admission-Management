const path = require('path');
const express = require('express');
const { documentsDirectory } = require('../config');
const { requireStudentAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/prospectus.pdf', requireStudentAuth, (req, res, next) => {
  res.download(
    path.join(documentsDirectory, 'Prospectus.pdf'),
    'NSACOE-Prospectus.pdf',
    (error) => error && next(error),
  );
});

router.get('/acceptance-letter.pdf', requireStudentAuth, (req, res, next) => {
  res.download(
    path.join(documentsDirectory, 'Acceptance Letter.pdf'),
    'NSACOE-Acceptance-Letter.pdf',
    (error) => error && next(error),
  );
});

module.exports = router;
