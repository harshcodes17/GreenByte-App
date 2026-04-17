function round(value) {
  return Math.round(value * 100) / 100;
}

function calculateImpactFromWeight(totalWeightKg) {
  const co2SavedKg = round(totalWeightKg * 1.8);
  const treesSaved = round(totalWeightKg / 6);
  const rawMaterialRecoveredKg = round(totalWeightKg * 0.65);
  const coinsEarned = Math.max(10, Math.round(totalWeightKg * 8));

  return {
    totalWeightKg: round(totalWeightKg),
    co2SavedKg,
    treesSaved,
    rawMaterialRecoveredKg,
    coinsEarned
  };
}

module.exports = {
  calculateImpactFromWeight,
  round
};
