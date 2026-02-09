/**
 * BAT Product Catalog
 * 
 * Used by:
 * - Scoring: Full details to evaluate salesman's product knowledge
 * - Supervisor: Basic awareness levels only
 * - Persona: What customer might already know
 */

// ============================================
// Types
// ============================================

export interface Product {
  id: string
  name: string
  brand: 'glo' | 'velo' | 'vuse'
  type: 'heated_tobacco' | 'oral_nicotine' | 'vaping'
  
  // Marketing
  tagline: string
  description: string
  
  // Technical
  keyFeatures: string[]
  howItWorks: string
  specs: Record<string, string>
  
  // Comparison
  vsFMC: string[]           // vs traditional cigarettes
  vsCompetition: string[]   // vs IQOS, Zyn, etc.
  
  // Commercial
  priceDevice?: string      // device price (if applicable)
  priceConsumables: string  // neo sticks, pouches, pods
  
  // Flavors/Variants
  variants: ProductVariant[]
  
  // Target
  idealFor: string[]        // customer profiles
  notFor: string[]          // who shouldn't use
}

export interface ProductVariant {
  name: string
  flavor: 'tobacco' | 'menthol' | 'fruit' | 'mint' | 'coffee'
  nicotineStrength?: 'light' | 'medium' | 'strong' | 'extra_strong'
  description: string
}

// ============================================
// GLO - Heated Tobacco
// ============================================

export const gloHyperX2: Product = {
  id: 'glo_hyper_x2',
  name: 'glo™ HYPER X2',
  brand: 'glo',
  type: 'heated_tobacco',
  
  tagline: 'Zahřívá, nespaluje',
  description: `Prémiové zařízení na zahřívaný tabák. Technologie HeatBoost™ 
zahřívá speciálně navržené tabákové náplně neo™ na optimální teplotu, 
čímž uvolňuje chuť a nikotin bez spalování.`,
  
  keyFeatures: [
    'HeatBoost™ mode — intenzivnější chuť stisknutím tlačítka',
    'Zahřívá na 260°C (standardní) nebo 280°C (boost)',
    'Žádný popel, méně zápachu než cigarety',
    'Až 20 sessions na jedno nabití',
    'Nabíjení přes USB-C, plné nabití za 90 minut',
    'Kompaktní design, vejde se do kapsy',
  ],
  
  howItWorks: `Vložíte neo™ náplň (tabákový stick), zařízení zahřeje tabák 
na přesnou teplotu. Uvolní se chuť a nikotin, ale tabák nehoří. 
Po 4 minutách nebo 14 potaženích session končí.`,
  
  specs: {
    'Rozměry': '84 × 43 × 23 mm',
    'Hmotnost': '106 g',
    'Baterie': '2900 mAh',
    'Nabíjení': 'USB-C',
    'Doba session': '4 min / 14 potažení',
    'Teplota': '260°C standard, 280°C boost',
  },
  
  vsFMC: [
    'Žádné spalování = méně škodlivých látek*',
    'Žádný popel, čistší zážitek',
    'Výrazně méně zápachu na oblečení a rukou',
    'Lze použít i tam, kde nelze kouřit (některá místa)',
    'Tabáková chuť zachována',
  ],
  
  vsCompetition: [
    'Vyšší teplota než IQOS (260-280°C vs 250°C) = plnější chuť',
    'HeatBoost mode — možnost zintenzivnit chuť kdykoliv',
    'Delší výdrž baterie (20 vs 14 sessions)',
    'Rychlejší nabíjení',
    'Nižší cena zařízení při podobné kvalitě',
  ],
  
  priceDevice: '1 490 Kč (běžná cena), akce od 990 Kč',
  priceConsumables: 'neo™ náplně: 129 Kč / 20 ks',
  
  variants: [
    { name: 'Black', flavor: 'tobacco', description: 'Matná černá, elegantní' },
    { name: 'White', flavor: 'tobacco', description: 'Lesklá bílá, moderní' },
    { name: 'Blue', flavor: 'tobacco', description: 'Modrá metalíza' },
    { name: 'Gold', flavor: 'tobacco', description: 'Champagne zlatá, prémiová' },
  ],
  
  idealFor: [
    'Kuřáci hledající méně zapáchající alternativu',
    'Ti, kdo nemohou kouřit doma/v autě kvůli zápachu',
    'Lidé zajímající se o harm reduction',
    'Kuřáci přecházející z konkurenčních HTP',
  ],
  
  notFor: [
    'Nekuřáci',
    'Osoby mladší 18 let',
    'Ti, kdo chtějí přestat s nikotinem úplně',
  ],
}

// NEO sticks (consumables for glo)
export const neoSticks: Product = {
  id: 'neo_sticks',
  name: 'neo™ Sticks',
  brand: 'glo',
  type: 'heated_tobacco',
  
  tagline: 'Pravý tabák, moderní zážitek',
  description: `Speciálně navržené tabákové náplně pro zařízení glo™. 
Obsahují kvalitní tabák optimalizovaný pro zahřívání.`,
  
  keyFeatures: [
    'Pravý tabák, ne náhražka',
    'Optimalizováno pro zahřívání na 260-280°C',
    'Široká škála příchutí',
    '20 ks v balení',
  ],
  
  howItWorks: 'Vloží se do glo™ zařízení, zahřeje se, uvolní chuť a nikotin.',
  
  specs: {
    'Balení': '20 ks',
    'Délka sticku': '45 mm',
    'Průměr': '7 mm',
  },
  
  vsFMC: [
    'Stejná tabáková chuť',
    'Méně zápachu',
    'Žádný popel',
  ],
  
  vsCompetition: [
    'Více příchutí než HEETS',
    'Optimalizováno pro vyšší teplotu glo = intenzivnější chuť',
  ],
  
  priceConsumables: '129 Kč / 20 ks',
  
  variants: [
    // Tobacco
    { name: 'Brilliant Tobacco', flavor: 'tobacco', description: 'Klasická tabáková, vyvážená' },
    { name: 'True Tobacco', flavor: 'tobacco', description: 'Intenzivní tabáková, plná chuť' },
    { name: 'Dark Tobacco', flavor: 'tobacco', description: 'Pražený tabák, silnější' },
    
    // Menthol / Mint
    { name: 'Fresh Mint', flavor: 'mint', description: 'Osvěžující máta' },
    { name: 'Polar Mint', flavor: 'menthol', description: 'Ledový mentol' },
    { name: 'Ice Click', flavor: 'menthol', description: 'Mentol s kapsulí pro extra chlad' },
    
    // Fruit
    { name: 'Berry Boost', flavor: 'fruit', description: 'Lesní plody' },
    { name: 'Tropic Click', flavor: 'fruit', description: 'Tropické ovoce s kapsulí' },
  ],
  
  idealFor: [
    'Uživatelé glo™ zařízení',
    'Kuřáci hledající alternativu',
  ],
  
  notFor: [
    'Nekuřáci',
    'Osoby mladší 18 let',
  ],
}

// ============================================
// VELO - Oral Nicotine Pouches
// ============================================

export const velo: Product = {
  id: 'velo',
  name: 'VELO',
  brand: 'velo',
  type: 'oral_nicotine',
  
  tagline: 'Nikotin bez kouře, bez tabáku',
  description: `Nikotinové sáčky bez tabáku. Diskrétní, čisté, bez zápachu. 
Vložíte pod horní ret a nikotin se uvolňuje postupně.`,
  
  keyFeatures: [
    'Bez tabáku — obsahuje pouze nikotin',
    'Bez kouře, bez zápachu',
    '100% diskrétní — nikdo nepozná',
    'Lze použít kdekoliv (kancelář, letadlo, restaurace)',
    'Různé síly nikotinu (4-17 mg)',
    'Uvolňuje nikotin 20-30 minut',
  ],
  
  howItWorks: `Vložíte sáček pod horní ret (mezi ret a dáseň). 
Nikotin se postupně vstřebává přes sliznici. 
Lehké mravenčení je normální. Po 20-30 minutách vyhodíte.`,
  
  specs: {
    'Formát': 'Mini / Slim',
    'Doba použití': '20-30 minut',
    'Balení': '20 sáčků',
    'Síla nikotinu': '4 / 6 / 10 / 17 mg',
  },
  
  vsFMC: [
    'Žádný kouř = žádné škody z inhalace',
    'Žádný zápach',
    'Lze použít kdekoliv, kdykoliv',
    '100% diskrétní',
    'Čisté ruce, čisté oblečení',
  ],
  
  vsCompetition: [
    'Širší škála příchutí než Zyn',
    'Více možností síly nikotinu',
    'Měkčí sáčky, pohodlnější pod rtem',
    'Dostupnější v ČR',
  ],
  
  priceConsumables: '99-129 Kč / 20 ks (podle síly)',
  
  variants: [
    // Mint
    { name: 'Mighty Peppermint', flavor: 'mint', nicotineStrength: 'strong', description: 'Silná máta, 10mg' },
    { name: 'Cool Storm', flavor: 'menthol', nicotineStrength: 'extra_strong', description: 'Ledový mentol, 17mg' },
    { name: 'Polar Mint', flavor: 'mint', nicotineStrength: 'medium', description: 'Chladivá máta, 6mg' },
    { name: 'Easy Mint', flavor: 'mint', nicotineStrength: 'light', description: 'Jemná máta, 4mg' },
    
    // Fruit
    { name: 'Berry Frost', flavor: 'fruit', nicotineStrength: 'medium', description: 'Lesní plody s chladem, 6mg' },
    { name: 'Tropic Breeze', flavor: 'fruit', nicotineStrength: 'medium', description: 'Tropické ovoce, 6mg' },
    { name: 'Ruby Berry', flavor: 'fruit', nicotineStrength: 'strong', description: 'Červené bobule, 10mg' },
    
    // Coffee
    { name: 'Roasted Coffee', flavor: 'coffee', nicotineStrength: 'medium', description: 'Pražená káva, 6mg' },
  ],
  
  idealFor: [
    'Kuřáci, kteří nemůžou kouřit v práci/doma',
    'Ti, kdo chtějí diskrétní alternativu',
    'Cestující (letadla, vlaky)',
    'Lidé, kterým vadí zápach kouře',
    'Přechod od cigaret bez viditelné změny',
  ],
  
  notFor: [
    'Nekuřáci',
    'Osoby mladší 18 let',
    'Ti, kdo chtějí rituál kouření',
  ],
}

// ============================================
// VUSE - Vaping
// ============================================

export const vuse: Product = {
  id: 'vuse_epod2',
  name: 'Vuse ePod 2',
  brand: 'vuse',
  type: 'vaping',
  
  tagline: 'Vapování nové generace',
  description: `Prémiová e-cigareta s uzavřeným systémem. 
Předplněné cartridge s e-liquidem. Žádné doplňování, žádný nepořádek.`,
  
  keyFeatures: [
    'Uzavřený systém — předplněné cartridge',
    'Magnetické připojení cartridge',
    'Automatický tah (bez tlačítka)',
    'USB-C rychlonabíjení',
    'Kompaktní, elegantní design',
    'Široká škála příchutí',
  ],
  
  howItWorks: `Nasadíte cartridge (magneticky zaklapne), 
potáhnete a zařízení se automaticky aktivuje. 
Jedna cartridge = cca 275 potažení.`,
  
  specs: {
    'Rozměry': '104 × 15 × 10 mm',
    'Hmotnost': '26 g',
    'Baterie': '370 mAh',
    'Nabíjení': 'USB-C',
    'Potažení/cartridge': '~275',
    'Síla nikotinu': '6 / 12 / 18 mg/ml',
  },
  
  vsFMC: [
    'Žádné spalování, žádný dehet',
    'Méně zápachu než cigarety',
    'Výrazně méně škodlivých látek*',
    'Široká škála příchutí',
    'Finančně výhodnější dlouhodobě',
  ],
  
  vsCompetition: [
    'Stabilnější výkon než JUUL',
    'Větší výběr příchutí než Logic',
    'Delší výdrž baterie',
    'Prémiový design z hliníku',
  ],
  
  priceDevice: '399 Kč (starter kit s 2 cartridge)',
  priceConsumables: 'Cartridge: 119 Kč / 2 ks',
  
  variants: [
    // Tobacco
    { name: 'Golden Tobacco', flavor: 'tobacco', description: 'Jemný tabák, sladší profil' },
    { name: 'Rich Tobacco', flavor: 'tobacco', description: 'Plný tabák, silnější' },
    
    // Menthol
    { name: 'Peppermint Tobacco', flavor: 'menthol', description: 'Tabák s mátou' },
    { name: 'Crisp Mint', flavor: 'mint', description: 'Čistá máta' },
    { name: 'Iced Mango', flavor: 'fruit', description: 'Ledové mango' },
    
    // Fruit
    { name: 'Berry Watermelon', flavor: 'fruit', description: 'Bobule a meloun' },
    { name: 'Tropical Mango', flavor: 'fruit', description: 'Tropické mango' },
    { name: 'Wild Berries', flavor: 'fruit', description: 'Lesní plody' },
  ],
  
  idealFor: [
    'Kuřáci přecházející na vaping',
    'Ti, kdo chtějí jednoduchost (žádné doplňování)',
    'Lidé preferující ovocné příchutě',
    'Mladší dospělí kuřáci hledající moderní alternativu',
  ],
  
  notFor: [
    'Nekuřáci',
    'Osoby mladší 18 let',
    'Ti, kdo preferují klasickou tabákovou chuť',
  ],
}

// ============================================
// Product Catalog Export
// ============================================

export const PRODUCTS: Record<string, Product> = {
  glo_hyper_x2: gloHyperX2,
  neo_sticks: neoSticks,
  velo: velo,
  vuse_epod2: vuse,
}

export const PRODUCT_BY_BRAND: Record<string, Product[]> = {
  glo: [gloHyperX2, neoSticks],
  velo: [velo],
  vuse: [vuse],
}

// ============================================
// Scoring Helpers
// ============================================

/**
 * Get key selling points for a product (for scoring evaluation)
 */
export function getKeySellingPoints(productId: string): string[] {
  const product = PRODUCTS[productId]
  if (!product) return []
  
  return [
    ...product.keyFeatures.slice(0, 3),
    ...product.vsFMC.slice(0, 2),
    ...product.vsCompetition.slice(0, 2),
  ]
}

/**
 * Get product recommendation based on customer profile
 */
export function getRecommendedProducts(profile: {
  currentProduct: 'fmc' | 'hp_competitor' | 'hp_lapsed_glo' | 'oral' | 'none'
  priceImportance: 'low' | 'medium' | 'high'
  flavorPreference: 'tobacco' | 'menthol' | 'fruit' | 'none'
  discretionNeeded: boolean
  smellSensitive: boolean
}): string[] {
  const recommendations: string[] = []
  
  // Smell sensitive or needs discretion → VELO first
  if (profile.smellSensitive || profile.discretionNeeded) {
    recommendations.push('velo')
  }
  
  // FMC smoker wanting to keep ritual → GLO
  if (profile.currentProduct === 'fmc') {
    recommendations.push('glo_hyper_x2')
  }
  
  // Competitor HP user → GLO (upgrade pitch)
  if (profile.currentProduct === 'hp_competitor') {
    recommendations.push('glo_hyper_x2')
  }
  
  // Lapsed GLO user → GLO (win back)
  if (profile.currentProduct === 'hp_lapsed_glo') {
    recommendations.push('glo_hyper_x2')
  }
  
  // Fruit preference → Vuse
  if (profile.flavorPreference === 'fruit') {
    recommendations.push('vuse_epod2')
  }
  
  return [...new Set(recommendations)]
}

/**
 * Check if a statement about a product is factually correct
 * (Used by scoring to verify salesman's claims)
 */
export function verifyProductClaim(
  productId: string,
  claim: string
): { valid: boolean; note?: string } {
  const product = PRODUCTS[productId]
  if (!product) return { valid: false, note: 'Produkt neexistuje' }
  
  const claimLower = claim.toLowerCase()
  
  // Check for forbidden claims
  if (claimLower.includes('zdravější') || claimLower.includes('bezpečn')) {
    return { valid: false, note: 'Nelze tvrdit zdravotní benefity' }
  }
  
  if (claimLower.includes('zdarma') || claimLower.includes('free')) {
    return { valid: false, note: 'Slovo "zdarma" je zakázáno' }
  }
  
  // GLO specific
  if (productId.includes('glo') && claimLower.includes('kouř')) {
    return { valid: false, note: 'GLO se "užívá", ne "kouří"' }
  }
  
  return { valid: true }
}

// ============================================
// Supervisor Helpers (Basic awareness only)
// ============================================

/**
 * Get simplified product info for supervisor
 * (Customer's perspective, not full catalog)
 */
export function getCustomerAwareness(
  awarenessLevel: number, // 0-10
  productId: string
): string {
  const product = PRODUCTS[productId]
  if (!product) return 'Neznámý produkt'
  
  if (awarenessLevel <= 2) {
    return `${product.name} — slyšel název, neví co to je`
  }
  
  if (awarenessLevel <= 5) {
    return `${product.name} — ví že existuje, základní představa (${product.type})`
  }
  
  if (awarenessLevel <= 7) {
    return `${product.name} — zná princip, viděl reklamy, možná zkusil`
  }
  
  return `${product.name} — dobře zná, možná používá nebo používal`
}
