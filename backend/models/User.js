const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  tipo: { type: String, enum: ['admin', 'compagnia', 'passeggero'], required: true }
});

module.exports = mongoose.model('User', userSchema);
