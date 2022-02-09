// noinspection JSUnresolvedFunction

require('dotenv').config({
    path: `.env.${process.env.NODE_ENV}`,
});
const { createRemoteFileNode } = require('gatsby-source-filesystem');
const {
    get,
    getAll,
    fetchPictures,
    fetchPrices,
    fetchPoi,
    fetchRooms,
    fetchSpecialOffers
} = require('./gatsby-functions');

exports.onPreInit = () => console.log('Loaded gatsby-orion-source-plugin');

exports.sourceNodes = async (
    {
        actions,
        createContentDigest,
    }
) => {
    const { createNode } = actions;

    console.log('Fetching locales');
    const {
        data: { 'hydra:member': locales },
    } = await get('/locales', {
        groups: ['website:locale:output'],
    });

    console.log('Fetching locations');
    const locations = await getAll('/locations', {
        groups: ['website:location:output'],
    });

    console.log('Fetching highlights');
    const highlights = await getAll('/highlights', {
        groups: ['website:highlight:output'],
    });

    console.log('Fetching seasons');
    const seasons = await getAll('/seasons', {
        groups: ['website:season:output'],
    });

    console.log('Fetching pois');
    const pois = await getAll('/point_of_interests', {
        groups: ['website:poi:output'],
    });

    console.log('Fetching room types');
    const roomTypes = await getAll('/room_types', {
        groups: ['website:roomType:output'],
    });

    console.log('Fetching furnishings');
    const furnishings = await getAll('/furnishings', {
        groups: ['website:furnishing:output'],
    });

    console.log('Fetching beds');
    const beds = await getAll('/beds', {
        groups: ['website:bed:output'],
    });

    console.log('Fetching rentals');
    const rentals = await getAll('/rentals', {
        groups: [
            'website:rental:output',
            'website:rentalPoi:output',
            'website:rentalSeason:output',
            'website:price:output',
        ],
    });

    console.log('Fetching pictures');
    await fetchPictures(rentals);
    console.log('Fetching prices');
    await fetchPrices(rentals);
    console.log('Fetching pois');
    await fetchPoi(rentals);
    console.log('Fetching rooms');
    await fetchRooms(rentals);
    console.log('Fetching special offers');
    await fetchSpecialOffers(rentals);

    const data = {
        beds,
        furnishings,
        highlights,
        userLocales: locales,
        locations,
        pois,
        roomTypes,
        seasons,
    };

    console.log('Create sub resources nodes');
    Object.keys(data).forEach((key) => data[key].forEach((item) => {
            const { '@id': id, '@type': type, ...rest } = item;
            return createNode({
                ...rest,
                id,
                parent:   null,
                children: [],
                internal: {
                    type:          'Locale' === type ? 'UserLocale' : type,
                    content:       JSON.stringify(item),
                    contentDigest: createContentDigest(item),
                },
            });
        }
    ));

    console.log('Create rentals nodes');
    rentals.forEach((rental) => {
        const {
            '@id':   id,
            '@type': type,
            pictures,
            ...item
        } = rental;
        const nodeId = id;

        (pictures || []).forEach((picture) => {
            const { '@id': subId, '@type': _subType, ...subItem } = picture.picture;
            return createNode({
                ...subItem,
                id:       subId,
                parent:   nodeId,
                children: [],
                internal: {
                    type:          'RentalPicture',
                    content:       JSON.stringify(subItem),
                    contentDigest: createContentDigest(subItem),
                },
            });
        });

        return createNode({
            ...item,
            highlights:       (item.highlights || []),
            rooms:            (item.rooms || []),
            pictures:         (pictures || []).map((picture) => picture.picture['@id']),
            mainPicture:      (pictures || [])[0]?.picture?.['@id'],
            hasSpecialOffers: item.specialOffers.length > 0,
            id:               nodeId,
            parent:           null,
            children:         [],
            internal:         {
                type,
                content:       JSON.stringify(item),
                contentDigest: createContentDigest(item),
            },
        });
    });
};

exports.onCreateNode = async ({ node, actions: { createNode, createNodeField }, createNodeId, getCache }) => {
    if (process.env.NODE_ENV === 'development') {
        process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
    }
    if (node.internal.type === 'RentalPicture') {
        try {
            const fileNode = await createRemoteFileNode({
                url:          encodeURI(node.contentUrl.replace('api.orion.wip', '127.0.0.1:8000').replace('https', 'http')),
                parentNodeId: node.id,
                createNode,
                createNodeId,
                getCache,
            });

            if (fileNode) {
                createNodeField({ node, name: 'remoteFile', value: fileNode.id });
            }
        } catch (e) {
            console.log(e);
        }
    }
};

exports.createSchemaCustomization = ({ actions, schema }) => {
    const { createTypes } = actions;
    const typeDefs = [
        schema.buildObjectType({
            name:   'RentalTranslation',
            fields: {
                description:   {
                    type: 'String'
                },
                view:          {
                    type: 'String'
                },
                complementary: {
                    type: 'String'
                },
            },
        }),
        schema.buildObjectType({
            name:   'RentalTranslations',
            fields: {
                fr_FR: {
                    type: 'RentalTranslation',
                },
                en_US: {
                    type: 'RentalTranslation',
                },
            },
        }),
        schema.buildObjectType({
            name:   'TitleTranslation',
            fields: {
                title: {
                    type: 'String',
                },
            },
        }),
        schema.buildObjectType({
            name:   'TitleTranslations',
            fields: {
                fr_FR: {
                    type: 'TitleTranslation',
                },
                en_US: {
                    type: 'TitleTranslation',
                },
            },
        }),
        schema.buildObjectType({
            name:       'Bed',
            interfaces: ['Node'],
            fields:     {
                id:           {
                    type: 'ID'
                },
                translations: {
                    type: 'TitleTranslations',
                },
            },
        }),
        schema.buildObjectType({
            name:       'Furnishing',
            interfaces: ['Node'],
            fields:     {
                id:           {
                    type: 'ID'
                },
                translations: {
                    type: 'TitleTranslations',
                },
            },
        }),
        schema.buildObjectType({
            name:       'Highlight',
            interfaces: ['Node'],
            fields:     {
                id:           {
                    type: 'ID'
                },
                translations: {
                    type: 'TitleTranslations',
                },
            },
        }),
        schema.buildObjectType({
            name:       'PointOfInterest',
            interfaces: ['Node'],
            fields:     {
                id:           {
                    type: 'ID'
                },
                unit:         {
                    type: 'String',
                },
                translations: {
                    type: 'TitleTranslations',
                },
            },
        }),
        schema.buildObjectType({
            name:       'RoomType',
            interfaces: ['Node'],
            fields:     {
                id:           {
                    type: 'ID'
                },
                translations: {
                    type: 'TitleTranslations',
                },
            },
        }),
        schema.buildObjectType({
            name:       'UserLocale',
            interfaces: ['Node'],
            fields:     {
                id:   {
                    type: 'ID'
                },
                code: {
                    type: 'String',
                },
            },
        }),
        schema.buildObjectType({
            name:       'Location',
            interfaces: ['Node'],
            fields:     {
                id:    {
                    type: 'ID'
                },
                title: {
                    type: 'String',
                },
            },
        }),
        schema.buildObjectType({
            name:   'RoomTypeTranslations',
            fields: {
                fr_FR: {
                    type: 'TitleTranslation',
                },
                en_US: {
                    type: 'TitleTranslation',
                },
            },
        }),
        schema.buildObjectType({
            name:       'RoomType',
            interfaces: ['Node'],
            fields:     {
                id:           {
                    type: 'ID'
                },
                bedroom:      {
                    type: 'Boolean',
                },
                code:         {
                    type: 'String!',
                },
                translations: {
                    type: 'RoomTypeTranslations'
                }
            },
        }),
        schema.buildObjectType({
            name:   'RoomTranslation',
            fields: {
                bathroomComment: {
                    type: 'String',
                },
                information:     {
                    type: 'String',
                },
                view:            {
                    type: 'String',
                },
            }
        }),
        schema.buildObjectType({
            name:   'RoomTranslations',
            fields: {
                fr_FR: {
                    type: 'RoomTranslation',
                },
                en_US: {
                    type: 'RoomTranslation',
                },
            },
        }),
        schema.buildObjectType({
            name:   'Room',
            fields: {
                id:                  {
                    type: 'ID'
                },
                bathroomFurnishings: {
                    type:    '[Furnishing]',
                    resolve: (source, _args, context) => {
                        return context.nodeModel.getNodesByIds({
                            ids:  source.bathroomFurnishings,
                            type: 'Furnishing',
                        });
                    },
                },
                bathroomType:        {
                    type: 'String',
                },
                bed:                 {
                    type:    'Bed',
                    resolve: (source, _args, context) => {
                        return context.nodeModel.getNodeById({
                            id:   source.bed,
                            type: 'Bed',
                        });
                    },
                },
                capacity:            {
                    type: 'String',
                },
                furnishings:         {
                    type:    '[Furnishing]',
                    resolve: (source, _args, context) => {
                        return context.nodeModel.getNodesByIds({
                            ids:  source.furnishings,
                            type: 'Furnishing',
                        });
                    },
                },
                roomType:            {
                    type:    'RoomType',
                    resolve: (source, _args, context) => {
                        return context.nodeModel.getNodeById({
                            id:   source.roomType,
                            type: 'RoomType',
                        });
                    },
                },
                translations:        {
                    type: 'RoomTranslations',
                },
            },

        }),
        schema.buildObjectType({
            name:   'SeasonTranslation',
            fields: {
                title:    {
                    type: 'String',
                },
                subtitle: {
                    type: 'String',
                },
            },
        }),
        schema.buildObjectType({
            name:   'SeasonTranslations',
            fields: {
                fr_FR: {
                    type: 'SeasonTranslation',
                },
                en_US: {
                    type: 'SeasonTranslation',
                },
            },
        }),
        schema.buildObjectType({
            name:       'Season',
            interfaces: ['Node'],
            fields:     {
                id:             {
                    type: 'ID'
                },
                minBookingDays: {
                    type: 'String'
                },
                periodStart:    {
                    type:       'Date',
                    extensions: {
                        dateformat: {},
                    },
                },
                periodEnd:      {
                    type:       'Date',
                    extensions: {
                        dateformat: {},
                    },
                },
                translations:   {
                    type: 'SeasonTranslations'
                }
            },
        }),
        schema.buildObjectType({
            name:   'RentalSeason',
            fields: {
                id:             {
                    type: 'ID'
                },
                minBookingDays: {
                    type: 'Int'
                },
                season:         {
                    type:    'Season',
                    resolve: (source, _args, context) => {
                        return context.nodeModel.getNodeById({
                            id:   source.season,
                            type: 'Season',
                        });
                    },
                }
            }
        }),
        schema.buildObjectType({
            name:   'Price',
            fields: {
                id:           {
                    type: 'ID'
                },
                price:        {
                    type: 'Float',
                },
                bedroomCount: {
                    type: 'Int',
                },
                season:       {
                    type:    'Season',
                    resolve: (source, _args, context) => {
                        return context.nodeModel.getNodeById({
                            id:   source.season,
                            type: 'Season',
                        });
                    },
                }
            }
        }),
        schema.buildObjectType({
            name:   'PointOfInterestRental',
            fields: {
                id:              {
                    type: 'ID'
                },
                value:           {
                    type: 'String',
                },
                pointOfInterest: {
                    type:    'PointOfInterest',
                    resolve: (source, _args, context) => {
                        return context.nodeModel.getNodeById({
                            id:   source.pointOfInterest,
                            type: 'PointOfInterest',
                        });
                    },
                }
            },
        }),
        schema.buildObjectType({
            name:   'SpecialOffer',
            fields: {
                id:           {
                    type: 'ID'
                },
                periodStart:  {
                    type:       'Date',
                    extensions: {
                        dateformat: {},
                    },
                },
                periodEnd:    {
                    type:       'Date',
                    extensions: {
                        dateformat: {},
                    },
                },
                translations: {
                    type: 'SeasonTranslations'
                }
            },
        }),
        schema.buildObjectType({
            name:       'Rental',
            interfaces: ['Node'],
            fields:     {
                id:                  {
                    type: 'ID'
                },
                title:               {
                    type: 'String'
                },
                published:           {
                    type: 'Boolean'
                },
                managed:           {
                    type: 'Boolean'
                },
                rentalType:          {
                    type: 'String'
                },
                virtualVisit:        {
                    type: 'String'
                },
                city:                {
                    type: 'String'
                },
                capacity:            {
                    type: 'Int'
                },
                lat:                 {
                    type: 'Float'
                },
                lng:                 {
                    type: 'Float'
                },
                highlights:          {
                    type:    '[Highlight]',
                    resolve: (source, _args, context) => {
                        return context.nodeModel.getNodesByIds({
                            ids:  source.highlights,
                            type: 'Highlight',
                        });
                    }
                },
                prices:              {
                    type: '[Price]',
                },
                rooms:               {
                    type: '[Room]',
                },
                rentalSeasons:       {
                    type: '[RentalSeason]',
                },
                location:            {
                    type:    'Location',
                    resolve: (source, _args, context) => {
                        return context.nodeModel.getNodeById({
                            id:   source.location,
                            type: 'Location',
                        });
                    },
                },
                pointOfInterests:    {
                    type: '[PointOfInterestRental]',
                },
                specialOffers:       {
                    type: '[SpecialOffer]',
                },
                hasSpecialOffers:    {
                    type: 'Boolean',
                },
                bedroomCount:        {
                    type: 'Int'
                },
                bathroomCount:       {
                    type: 'Int'
                },
                slug:                {
                    type: 'String'
                },
                positionHighlighted: {
                    type: 'Int'
                },
                translations:        {
                    type: 'RentalTranslations'
                },
                pictures:            {
                    type:    '[RentalPicture]',
                    resolve: (source, _args, context) => {
                        return context.nodeModel.getNodesByIds({
                            ids:  source.pictures,
                            type: 'RentalPicture',
                        });
                    }
                },
                mainPicture:         {
                    type:    'RentalPicture',
                    resolve: (source, _args, context) => {
                        return context.nodeModel.getNodeById({
                            id:   source.mainPicture,
                            type: 'RentalPicture',
                        });
                    }
                }
            },
        }),
        schema.buildObjectType({
            name:       'RentalPicture',
            interfaces: ['Node'],
            fields:     {
                id:         {
                    type: 'ID'
                },
                cdnId:      {
                    type: 'String',
                },
                format:     {
                    type: 'String',
                },
                contentUrl: {
                    type: 'String',
                },
                remoteFile: {
                    type:    'File',
                    resolve: (source, _args, context) => {
                        return source.fields ? context.nodeModel.getNodeById({
                            id:   source.fields.remoteFile,
                            type: 'File',
                        }) : null;
                    }
                },
            },
        })
    ];
    createTypes(typeDefs);
};
