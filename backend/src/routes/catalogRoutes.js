const express = require('express');
const { listCatalog } = require('../controllers/catalogController');

const router = express.Router();

router.get('/', listCatalog);

module.exports = router;
