function notImplemented(endpointName) {
  return (_req, res) => {
    res.status(501).json({
      error: 'Not implemented yet',
      endpoint: endpointName,
    });
  };
}

module.exports = { notImplemented };
