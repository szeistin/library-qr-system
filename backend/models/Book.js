const mongoose = require('mongoose');
const BookSchema = new mongoose.Schema({
  title: { type: String, required: true },
  author: String,
  category: String,
  isbn: String,
  total_copies: { type: Number, default: 1 },
  available_copies: { type: Number, default: 1 },
});
module.exports = mongoose.model('Book', BookSchema);