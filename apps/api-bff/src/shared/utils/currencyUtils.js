/**
 * Currency Utilities - Redondeo para moneda Peruana (soles)
 * La moneda mínima en Perú es 0.10 soles
 */

function roundToTenCents(amount) {
  return Math.round(amount * 10) / 10;
}

module.exports = {
  roundToTenCents
};
