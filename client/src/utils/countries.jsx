// Countries: African countries first (INUKA is Africa-first), then the rest of the world.
export const AFRICAN_COUNTRIES = [
  'Algeria', 'Angola', 'Benin', 'Botswana', 'Burkina Faso', 'Burundi', 'Cabo Verde', 'Cameroon',
  'Central African Republic', 'Chad', 'Comoros', 'Congo (Republic)', 'DR Congo', "Côte d'Ivoire", 'Djibouti',
  'Egypt', 'Equatorial Guinea', 'Eritrea', 'Eswatini', 'Ethiopia', 'Gabon', 'Gambia', 'Ghana', 'Guinea',
  'Guinea-Bissau', 'Kenya', 'Lesotho', 'Liberia', 'Libya', 'Madagascar', 'Malawi', 'Mali', 'Mauritania',
  'Mauritius', 'Morocco', 'Mozambique', 'Namibia', 'Niger', 'Nigeria', 'Rwanda', 'São Tomé and Príncipe',
  'Senegal', 'Seychelles', 'Sierra Leone', 'Somalia', 'South Africa', 'South Sudan', 'Sudan', 'Tanzania',
  'Togo', 'Tunisia', 'Uganda', 'Zambia', 'Zimbabwe',
];

export const OTHER_COUNTRIES = [
  'Afghanistan', 'Albania', 'Andorra', 'Antigua and Barbuda', 'Argentina', 'Armenia', 'Australia', 'Austria',
  'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Bhutan',
  'Bolivia', 'Bosnia and Herzegovina', 'Brazil', 'Brunei', 'Bulgaria', 'Cambodia', 'Canada', 'Chile', 'China',
  'Colombia', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czechia', 'Denmark', 'Dominica', 'Dominican Republic',
  'Ecuador', 'El Salvador', 'Estonia', 'Fiji', 'Finland', 'France', 'Georgia', 'Germany', 'Greece', 'Grenada',
  'Guatemala', 'Guyana', 'Haiti', 'Honduras', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq',
  'Ireland', 'Israel', 'Italy', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kiribati', 'Kuwait', 'Kyrgyzstan',
  'Laos', 'Latvia', 'Lebanon', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Malaysia', 'Maldives', 'Malta',
  'Marshall Islands', 'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Myanmar', 'Nauru',
  'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'North Korea', 'North Macedonia', 'Norway', 'Oman',
  'Pakistan', 'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland',
  'Portugal', 'Qatar', 'Romania', 'Russia', 'Saint Kitts and Nevis', 'Saint Lucia',
  'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'Saudi Arabia', 'Serbia', 'Singapore', 'Slovakia',
  'Slovenia', 'Solomon Islands', 'South Korea', 'Spain', 'Sri Lanka', 'Suriname', 'Sweden', 'Switzerland',
  'Syria', 'Taiwan', 'Tajikistan', 'Thailand', 'Timor-Leste', 'Tonga', 'Trinidad and Tobago', 'Türkiye',
  'Turkmenistan', 'Tuvalu', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay',
  'Uzbekistan', 'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam', 'Yemen',
];

export const LANGUAGES = [
  'Kinyarwanda', 'Kiswahili', 'Kirundi', 'Luganda', 'Lingala', 'Somali', 'Amharic', 'Tigrinya', 'Arabic',
  'French', 'English', 'Portuguese', 'Hausa', 'Yoruba', 'Igbo', 'Zulu', 'Xhosa', 'Shona', 'Oromo', 'Other',
];

export function CountryOptions() {
  return (
    <>
      <option value="">Choose a country</option>
      <optgroup label="Africa">{AFRICAN_COUNTRIES.map((c) => <option key={c}>{c}</option>)}</optgroup>
      <optgroup label="Rest of the world">{OTHER_COUNTRIES.map((c) => <option key={c}>{c}</option>)}</optgroup>
    </>
  );
}
