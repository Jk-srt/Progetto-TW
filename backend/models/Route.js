const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema({
  da: { type: String, required: true },
  a: { type: String, required: true },
  durata: { type: Number, required: true }
});

module.exports = mongoose.model('Route', routeSchema);
