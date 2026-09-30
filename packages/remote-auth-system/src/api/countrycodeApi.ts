import axios from './axiosInstance';

export interface CountryResponse {
  countryName: string;
  countryCode: string;
  mobileCountryCode: string;
}

export interface CountryCodeItem {
  countryCode: string;
  mobileCountryCode: string;
}

export const fetchCountryCodes = async (): Promise<CountryCodeItem[]> => {
  const response = await axios.get<CountryResponse[]>('/api/v1/countries');
  const countries = response.data;

  const items: CountryCodeItem[] = countries
    .map((country) => ({
      countryCode: country.countryCode || '',
      mobileCountryCode: country.mobileCountryCode || '',
    }))
    .filter((item) => item.countryCode !== '' && item.mobileCountryCode !== '')
    .sort((a, b) => a.countryCode.localeCompare(b.countryCode));

  return items;
};