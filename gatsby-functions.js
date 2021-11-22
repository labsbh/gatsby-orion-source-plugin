/* eslint-disable @typescript-eslint/no-var-requires,@typescript-eslint/explicit-module-boundary-types */
const axios = require('axios');
const qs = require('qs');
const https = require('https');

const getToken = () => process.env.REACT_APP_JWT_TOKEN;

const REQUEST_DEFAULT_HEADERS = {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    Accept: 'application/ld+json',
    // eslint-disable-next-line @typescript-eslint/naming-convention
    'Content-Type': 'application/json',
    // eslint-disable-next-line @typescript-eslint/naming-convention
    'x-unpublished': '1',
    // eslint-disable-next-line @typescript-eslint/naming-convention
    'gatsby-request': '1',
};

const entrypoint = process.env.REACT_APP_API_ENDPOINT.substr(0, process.env.REACT_APP_API_ENDPOINT.length - 1);

let proxy = {};

if (process.env.PROXY_HOST && process.env.PROXY_PORT) {
    proxy.host = process.env.PROXY_HOST;
    proxy.port = process.env.PROXY_PORT;
} else {
    proxy = undefined;
}

const get = (endpoint, params = {}) =>
    axios.get(`${entrypoint}${endpoint}`, {
        params,
        headers: {
            ...REQUEST_DEFAULT_HEADERS,
            Authorization: `Bearer ${getToken()}`,
        },
        paramsSerializer: (params) => qs.stringify(params),
        httpsAgent: new https.Agent({
            rejectUnauthorized: false,
        }),
        proxy,
    });

const cache = {};

const getCache = (iri) => {
    if (cache[iri] === undefined) {
        const { data } = get(iri);
        cache[iri] = data;
    }
    return cache[iri];
};

const fetchPictures = async (rentals) => {
    await Promise.all(
        rentals.map(async (rental) => {
            try {
                rental.pictures = await getAll(`${rental['@id']}/pictures`, {
                    perPage: 10,
                    groups: ['website:picture:output', 'website:mediaObject:output'],
                });
            } catch (e) {}

            return rental;
        }),
    );
};

const fetchPrices = async (rentals) => {
    await Promise.all(
        rentals.map(async (rental) => {
            rental.prices = await getAll(`${rental['@id']}/prices`, {
                perPage: 30,
                groups: ['website:price:output'],
            });

            return rental;
        }),
    );
};

const fetchPoi = async (rentals) => {
    await Promise.all(
        rentals.map(async (rental) => {
            rental.pointOfInterests = await getAll(`${rental['@id']}/point_of_interests`, {
                groups: ['website:rentalPoi:output'],
            });

            return rental;
        }),
    );
};

const fetchSpecialOffers = async (rentals) => {
    await Promise.all(
        rentals.map(async (rental) => {
            rental.specialOffers = await getAll(`${rental['@id']}/special_offers`, {
                groups: ['website:specialOffer:output'],
            });

            return rental;
        }),
    );
};

const fetchRooms = async (rentals) => {
    await Promise.all(
        rentals.map(async (rental) => {
            try {
                rental.rooms = await getAll(`${rental['@id']}/rooms`, {
                    groups: ['website:room:output'],
                });
            } catch (e) {}

            return rental;
        }),
    );
};

const getAll = async (endpoint, params = {}) => {
    const allResults = [];
    let page = 1;
    let lastPage = 1;
    while (page <= lastPage) {
        const {
            data: { 'hydra:member': results, 'hydra:view': view },
        } = await get(endpoint, {
            ...params,
            page: page,
        });

        if (view && view['hydra:last']) {
            const matches = view['hydra:last'].match(/[&|?]page=(\d+)/i);
            if (matches && matches[1]) {
                lastPage = Math.min(matches[1], process.env.NODE_ENV === 'development' && endpoint === '/rentals' ? 1 : matches[1]);
            }
        }
        page++;
        allResults.push(...results);
    }

    return allResults;
};

module.exports = { get, getAll, getCache, fetchPictures, fetchPrices, fetchPoi, fetchRooms, fetchSpecialOffers };
