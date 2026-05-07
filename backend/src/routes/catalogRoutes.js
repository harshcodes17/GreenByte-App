const express = require('express');
const { listCatalog, updateCatalog, removeItem } = require('../controllers/catalogController');

const router = express.Router();

router.get('/', listCatalog);
router.post('/', updateCatalog);
router.delete('/:itemId', removeItem);

module.exports = router;
