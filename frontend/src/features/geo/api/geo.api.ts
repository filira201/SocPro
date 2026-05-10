import { api } from "@/shared/api/api";

export type GeoCountryRow = {
  code: string;
  name: string;
  nameEn: string;
};

export type GeoCityRow = {
  name: string;
  geonameId: string;
};

const GEO_CACHE_SEC = 86_400;

export const geoApi = api.injectEndpoints({
  endpoints: (builder) => ({
    listCountries: builder.query<GeoCountryRow[], void>({
      query: () => ({
        url: "/geo/countries",
        method: "GET",
      }),
      providesTags: [{ type: "Geo", id: "COUNTRY_LIST" }],
      keepUnusedDataFor: GEO_CACHE_SEC,
    }),

    searchCities: builder.query<
      { items: GeoCityRow[] },
      { countryCode: string; q: string; limit?: number }
    >({
      query: ({ countryCode, q, limit = 25 }) => ({
        url: "/geo/cities",
        method: "GET",
        params: { countryCode, q, limit },
      }),
      providesTags: (_result, _error, arg) => [
        {
          type: "Geo",
          id: `CITY_SEARCH_${arg.countryCode}_${arg.q}_${String(arg.limit ?? 25)}`,
        },
      ],
      keepUnusedDataFor: GEO_CACHE_SEC,
    }),
  }),
});

export const { useListCountriesQuery, useSearchCitiesQuery } = geoApi;
