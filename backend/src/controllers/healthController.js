function getHealth(req, res) {
  res.json({
    success: true,
    message: 'GreenByte backend is healthy'
  });
}

module.exports = {
  getHealth
};
