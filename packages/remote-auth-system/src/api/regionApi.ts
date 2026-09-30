import axios from "./axiosInstance"

interface CountryResponse {
    countryName: string;
    countryCode: string;
}

export const getAllCountry = async () : Promise<string[]> => {
    try {
        const response = await axios.get<CountryResponse[]>(`/api/v1/countries`);
        return response.data.map((c) => c.countryName);
    }
    catch (error: any) {
        throw error;
    }
}