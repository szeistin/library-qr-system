const crypto = require('crypto');

function generateToken() {
  return crypto.randomBytes(16).toString('hex');
}

function generateReferenceNumber() {
  const date = new Date();
  const yyyymmdd = date.toISOString().slice(0,10).replace(/-/g,'');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `LIB-${yyyymmdd}-${random}`;
}

function getAgeGroup(dob) {
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  if (age >= 6 && age <= 12) return 'Children';
  if (age >= 13 && age <= 21) return 'Adolescents';
  if (age >= 22 && age <= 35) return 'Young Adults';
  if (age >= 36) return 'Adults';
  return 'Unknown';
}

module.exports = { generateToken, generateReferenceNumber, getAgeGroup };