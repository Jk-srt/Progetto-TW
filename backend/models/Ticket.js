const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  // ...definizione campi biglietto...
});

module.exports = mongoose.model('Ticket', ticketSchema);

