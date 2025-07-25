const mongoose = require('mongoose');

const flightSchema = new mongoose.Schema({
  // ...definizione campi volo...
});

module.exports = mongoose.model('Flight', flightSchema);

