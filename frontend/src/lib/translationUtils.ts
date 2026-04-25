// Translation utility to load and parse the translation.csv file
import translationCsv from './translation.csv?raw';

interface TranslationMap {
  [key: string]: {
    en: string;
    vi: string;
  };
}

let translationCache: TranslationMap | null = null;

const parseTranslationCsv = (): TranslationMap => {
  if (translationCache) {
    return translationCache;
  }

  const map: TranslationMap = {};
  const lines = translationCsv.trim().split('\n');
  
  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const [productEn, productVi] = lines[i].split(',').map(s => s.trim());
    
    if (productEn && productVi) {
      // Use English name as the key (case-insensitive)
      const key = productEn.toLowerCase();
      map[key] = {
        en: productEn,
        vi: productVi
      };
    }
  }

  translationCache = map;
  return map;
};

export const getProductTranslation = (productName: string, language: 'en' | 'vi' = 'en'): string => {
  const map = parseTranslationCsv();
  const key = productName.toLowerCase();
  
    console.log("map=" , map)
    console.log("key=", key)
    
  // Try exact match first (case-insensitive)
  if (map[key]) {
    return map[key][language];
  }

  // Try partial match - check if productName contains or is contained in any key
  for (const [mapKey, translations] of Object.entries(map)) {
    if (mapKey.includes(key) || key.includes(mapKey)) {
      return translations[language];
    }
  }

  // Fallback to original product name if no match found
  return productName;
};

export const loadTranslations = (): TranslationMap => {
  return parseTranslationCsv();
};
