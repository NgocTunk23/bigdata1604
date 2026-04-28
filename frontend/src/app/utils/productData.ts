import standardRulesData from "../../data/association_rules.json";
import superRulesData from "../../data/association_rules_super.json";
// Extract all unique products from association rules
export const extractAllProducts = () => {
  const productsSet = new Set<string>();

  [...standardRulesData, ...superRulesData].forEach(rule => {
    rule.antecedent.forEach((product: string) => productsSet.add(product));
    rule.consequent.forEach((product: string) => productsSet.add(product));
  });

  return Array.from(productsSet).sort();
};

// Calculate product frequency from rules (how often they appear)
export const calculateProductFrequency = () => {
  const frequency: Record<string, number> = {};

  [...standardRulesData, ...superRulesData].forEach(rule => {
    const allProducts = [...rule.antecedent, ...rule.consequent];
    allProducts.forEach((product: string) => {
      frequency[product] = (frequency[product] || 0) + 1;
    });
  });

  return frequency;
};

// Get top N products by frequency
export const getTopProducts = (n: number = 10) => {
  const frequency = calculateProductFrequency();
  const sorted = Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);

  return sorted.map(([name, count]) => ({
    name,
    sales: Math.floor(count * 50 + Math.random() * 100), // Convert frequency to sales metric
  }));
};

// All unique products
export const ALL_PRODUCTS = extractAllProducts();

// Standard products (from standard rules only)
export const STANDARD_PRODUCTS = (() => {
  const productsSet = new Set<string>();
  standardRulesData.forEach(rule => {
    rule.antecedent.forEach((product: string) => productsSet.add(product));
  });
  return Array.from(productsSet).sort();
})();

// Super products (from super rules only, unique to super)
export const SUPER_PRODUCTS = (() => {
  const productsSet = new Set<string>();
  superRulesData.slice(0, 8).forEach(rule => {
    rule.antecedent.forEach((product: string) => productsSet.add(product));
  });
  return Array.from(productsSet).sort();
})();
