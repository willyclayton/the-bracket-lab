/**
 * Maps ESPN API team displayName/shortDisplayName to the team names
 * used in our actual-results.json and bracket data.
 *
 * ESPN returns full school names (e.g. "Connecticut Huskies") via displayName
 * and abbreviated names (e.g. "UConn") via shortDisplayName. We try
 * shortDisplayName first, then displayName, then strip common suffixes.
 */

// Explicit overrides where ESPN name differs from our name
const ESPN_TO_SITE: Record<string, string> = {
  // ESPN shortDisplayName -> site name
  'Connecticut': 'UConn',
  'UConn': 'UConn',
  'St. John\'s (NY)': 'St. John\'s',
  'St. John\'s': 'St. John\'s',
  'Saint John\'s': 'St. John\'s',
  'Long Island University': 'LIU',
  'LIU Brooklyn': 'LIU',
  'Prairie View': 'Prairie View A&M',
  'Prairie View A&M': 'Prairie View A&M',
  'Cal Baptist': 'Cal Baptist',
  'California Baptist': 'Cal Baptist',
  'N. Iowa': 'Northern Iowa',
  'Northern Iowa': 'Northern Iowa',
  'UNI': 'Northern Iowa',
  'S. Florida': 'South Florida',
  'South Florida': 'South Florida',
  'USF': 'South Florida',
  'N. Dakota St.': 'North Dakota State',
  'North Dakota St.': 'North Dakota State',
  'North Dakota State': 'North Dakota State',
  'NDSU': 'North Dakota State',
  'Kennesaw St.': 'Kennesaw State',
  'Kennesaw State': 'Kennesaw State',
  'Utah St.': 'Utah State',
  'Utah State': 'Utah State',
  'Michigan St.': 'Michigan State',
  'Michigan State': 'Michigan State',
  'Iowa St.': 'Iowa State',
  'Iowa State': 'Iowa State',
  'Ohio St.': 'Ohio State',
  'Ohio State': 'Ohio State',
  'Penn St.': 'Penn State',
  'Pitt': 'Pittsburgh',
  'Texas A&M': 'Texas A&M',
  'Saint Mary\'s': 'Saint Mary\'s',
  'Saint Mary\'s (CA)': 'Saint Mary\'s',
  'St. Mary\'s': 'Saint Mary\'s',
  'SMU': 'SMU',
  'UCF': 'UCF',
  'VCU': 'VCU',
  'BYU': 'BYU',
  'UMBC': 'UMBC',
  'UCLA': 'UCLA',
  'Wright St.': 'Wright State',
  'Wright State': 'Wright State',
  'Queens (NC)': 'Queens',
  'Queens': 'Queens',
  'McNeese St.': 'McNeese',
  'McNeese State': 'McNeese',
  'McNeese': 'McNeese',
  'Texas Tech': 'Texas Tech',
  'Saint Louis': 'Saint Louis',
  'St. Louis': 'Saint Louis',
  'North Carolina': 'North Carolina',
  'UNC': 'North Carolina',
};

// All team names in our data for fuzzy matching
const SITE_TEAMS_ARRAY = [
  'Akron', 'Alabama', 'Arizona', 'Arkansas', 'BYU', 'Cal Baptist', 'Clemson',
  'Duke', 'Florida', 'Furman', 'Georgia', 'Gonzaga', 'Hawaii', 'High Point',
  'Hofstra', 'Houston', 'Idaho', 'Illinois', 'Iowa', 'Iowa State', 'Kansas',
  'Kennesaw State', 'Kentucky', 'LIU', 'Louisville', 'McNeese', 'Miami',
  'Michigan', 'Michigan State', 'Missouri', 'Nebraska', 'North Carolina',
  'North Dakota State', 'Northern Iowa', 'Ohio State', 'Penn', 'Prairie View A&M',
  'Purdue', 'Queens', 'SMU', 'Saint Louis', 'Saint Mary\'s', 'Santa Clara',
  'Siena', 'South Florida', 'St. John\'s', 'TCU', 'Tennessee', 'Tennessee State',
  'Texas', 'Texas A&M', 'Texas Tech', 'Troy', 'UCF', 'UCLA', 'UConn', 'UMBC',
  'Utah State', 'VCU', 'Vanderbilt', 'Villanova', 'Virginia', 'Wisconsin',
  'Wright State',
];
const SITE_TEAMS = new Set(SITE_TEAMS_ARRAY);

/**
 * Convert an ESPN team name to the site's team name.
 * Tries explicit map first, then checks if the name already exists in our data.
 */
export function normalizeTeamName(espnName: string): string {
  // Direct lookup
  if (ESPN_TO_SITE[espnName]) return ESPN_TO_SITE[espnName];

  // Already matches a site team name
  if (SITE_TEAMS.has(espnName)) return espnName;

  // Try stripping common mascot suffixes (ESPN sometimes returns "Duke Blue Devils")
  // Take first word(s) before the mascot
  for (const siteName of SITE_TEAMS_ARRAY) {
    if (espnName.startsWith(siteName)) return siteName;
  }

  // Return as-is — will need manual mapping if mismatch
  return espnName;
}
