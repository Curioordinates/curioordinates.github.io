import path from "path";
import { cascadeFields } from "./cascade-lib";
import { convertNameToSlug, createCacheFilenameFromUrl, ensureFieldsInMdFieldsFile, fetchHtmlFromUrlViaCache, findFilesInDirectory, getHtmlFromUrl, getUrlsFromHtml, keepFilesWithoutRequiredFields, keepFilesWithRequiredFields, makeNationalTrustSearchUrlFromQuery, parseLatitudeLongitude, readMdFieldsFile, toTitleCase, writeHtmlToFilename } from "./steps";
import * as fs from 'fs';

const CACHE_BASE_DIR = '/Users/Shared/data/cache';

describe('cascadeFields', () => {

    jest.setTimeout(999999);


    it('should filter files ', async () => {

        const { error, files } = await cascadeFields(
            {
                directory: '/Users/cholden/obsidian-data/rdf/namespace/nationaltrust.org.uk',
                requiredFields: ['coordinates', 'url']
            },
            findFilesInDirectory,
            keepFilesWithoutRequiredFields

        );

        const errorFile = path.join('/Users/cholden/obsidian-data/rdf/namespace/nationaltrust.org.uk', '_attention.md');
        const content = files ? files?.map(fileName => `[[${fileName}]]`).join('\n') : ''
        fs.writeFileSync(errorFile, content);
    });

    it('should work with 2 functions', async () => {

        const items = fs.readFileSync(path.join(__dirname, 'items.csv'), 'utf8').split('\n').map(line => line.trim()).filter(line => line.length > 0);

        let itemNumber = 0;
        for (const line of items) {

            const columns = line.split(',');
            if (columns.length !== 3) {
                continue;
            }

            const [longitude, latitude, name] = columns;

            if (latitude === '' || longitude === '' || name === '') {
                continue;
            }


            const { slug } = await convertNameToSlug({ name });
            if (slug) {
                const filePath = path.join('/Users/cholden/obsidian-data/rdf/namespace/nationaltrust.org.uk', slug + '.md');

                const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude}%2C${longitude}`

                const { error } = await ensureFieldsInMdFieldsFile({ fileName: filePath, fields: { coordinates: `${latitude},${longitude}`, googleUrl } });
                if (error) {
                    console.log(error);
                    process.exit(0);
                }

            }





            /*            const { error, html, htmlIsFromCache } = await cascadeFields(
                            {
                                url: item,
                                cacheBaseDir: CACHE_BASE_DIR
                            },
                            createCacheFilenameFromUrl,
                            fetchHtmlFromUrlViaCache,
                        );
            */
        }
    });


    test('national-trust export', async () => {

        const targetDirectoryPath = '/Users/Shared/projects/curioordinates.github.io/data/source/national-trust';

        const { error, files } = await cascadeFields(
            {
                directory: '/Users/cholden/obsidian-data/rdf/namespace/nationaltrust.org.uk',
                requiredFields: ['coordinates', 'url']
            },
            findFilesInDirectory,
            keepFilesWithRequiredFields
        );

        if (files) {

            const lines = ['latitude,longitude,label,link'];
            for (const fileName of files) {
                const { fields, error } = await readMdFieldsFile({ fileName });
                if (error) {
                    continue;
                }

                const { url, coordinates } = fields;

                const label = toTitleCase(fileName.split('/').pop()?.replace('.md', '').replace(/_/g, ' '));

                const { latitude, longitude } = parseLatitudeLongitude(coordinates);
                lines.push(`${latitude},${longitude},${label},${url}`);
            }

            const targetFilePath = path.join(targetDirectoryPath, 'national-trust.csv');
            fs.writeFileSync(targetFilePath, lines.join('\n'));


        }
    });


    it('should parse numeric latitude longitude', () => {
        const { latitude, longitude } = parseLatitudeLongitude('51.5074,0.1278');
        expect(latitude).toBe(51.5074);
        expect(longitude).toBe(0.1278);



    });

    it('should parse non-numeric latitude longitude', () => {
        const { latitude, longitude } = parseLatitudeLongitude('https://www.google.com/maps/dir/?api=1&destination=52.669399%2C-2.68733');
        expect(latitude).toBe(51.5074);
        expect(longitude).toBe(0.1278);


    });

    it('should work with 2 cc', async () => {

        const items = fs.readFileSync(path.join(__dirname, 'items.txt'), 'utf8').split('\n').map(line => line.trim()).filter(line => line.length > 0);

        let itemNumber = 0;
        for (const url of items) {
            const urlParts = url.split('/');
            const name = urlParts[urlParts.length - 1];
            const { slug } = await convertNameToSlug({ name });
            console.log(slug);

            const filePath = path.join('/Users/cholden/obsidian-data/rdf/namespace/nationaltrust.org.uk', slug + '.md');

            const { error } = await ensureFieldsInMdFieldsFile({ fileName: filePath, fields: { url } });
            if (error) {
                console.log(error);
                process.exit(0);
            }
            /*            const { error, html, htmlIsFromCache } = await cascadeFields(
                            {
                                url: item,
                                cacheBaseDir: CACHE_BASE_DIR
                            },
                            createCacheFilenameFromUrl,
                            fetchHtmlFromUrlViaCache,
                        );
            */
        }
    });

});