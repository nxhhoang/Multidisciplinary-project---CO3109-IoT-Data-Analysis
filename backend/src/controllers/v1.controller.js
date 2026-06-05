function getApiV1Info(_req, res) {
  return res.json({
    message: "API v1 is available",
  });
}

module.exports = {
  getApiV1Info,
};
