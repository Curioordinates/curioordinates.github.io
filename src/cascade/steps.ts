import path from "path";
import { ErrorOrFields } from "./cascade-lib"
import * as fs from 'fs';

export const fetchHtmlFromUrl = async ({ url }: { url: string }): Promise<ErrorOrFields<{ html: string }>> => {
    const response = await fetch(url);

    if (response.ok) {
        const html = await response.text();
        return { html, error: null };
    } else {
        return {
            error: new Error("Failed to fetch HTML - " + response.statusText),
            html: null
        };
    }
}

export const getUrlsFromHtml = async ({ html }: { html: string }): Promise<ErrorOrFields<{ urls: string[] }>> => {
    const matches = html.match(/(http:\/\/[^\s]+)/g);
    if (!matches) {
        return { error: null, urls: [] };
    } else {
        return { error: null, urls: matches };
    }
}

export const makeNationalTrustSearchUrlFromQuery = async ({ query }: { query: string }): Promise<ErrorOrFields<{ url: string }>> => {
    const url = `https://www.nationaltrust.org.uk/site-search#gsc.tab=0&gsc.q=${encodeURIComponent(query)}&gsc.sort=`;
    return { url, error: null };
}

export const writeHtmlToFilename = async ({ html, filename }: { html: string, filename: string }): Promise<ErrorOrFields<{ filename: string }>> => {
    fs.writeFileSync(filename, html);
    return { filename, error: null };
}

export const convertNameToSlug = async ({ name }: { name: string }): Promise<ErrorOrFields<{ slug: string }>> => {
    if (name === null) {
        return { slug: null, error: new Error("{name} was null") };
    }
    const cleanName = name.trim().toLowerCase();
    if (cleanName.length === 0) {
        return { slug: null, error: new Error("{name} was empty") };
    }
    const slug = cleanName.replace(/,/g, ' ').replace(/-/g, ' ').replace(/ +/g, '_').replace(/'/,'');
    if (slug.length === 0) {
        return { slug: null, error: new Error("Slug was empty") };
    }
    return { slug, error: null };
}

export const createCacheFilenameFromUrl = async ({ url, cacheBaseDir }: { url: string, cacheBaseDir: string }): Promise<ErrorOrFields<{ cacheFilename: string }>> => {
    const urlWithoutQuery = url.split('?')[0].trim();

    if (urlWithoutQuery.length === 0) {
        return { cacheFilename: null, error: new Error("Base of {url} was empty") };
    }

    const cacheFilename = cacheBaseDir + "/" + urlWithoutQuery.replace(/\:\/\//, '/').split('/').map(part => encodeURIComponent(part)).join('/') + '.cache';

    return { cacheFilename, error: null };
}

export const fetchHtmlFromUrlViaCache = async ({ url, cacheFilename }: { url: string, cacheFilename: string }): Promise<ErrorOrFields<{ html: string, htmlIsFromCache: boolean }>> => {
    if (fs.existsSync(cacheFilename)) {
        const html = fs.readFileSync(cacheFilename, 'utf8');
        return { html, htmlIsFromCache: true, error: null };
    }

    const { html, error } = await fetchHtmlFromUrl({ url });
    if (error) {
        return { html: null, htmlIsFromCache: null, error };
    }

    const directoryForCacheFile = path.dirname(cacheFilename);
    if (!fs.existsSync(directoryForCacheFile)) {
        fs.mkdirSync(directoryForCacheFile, { recursive: true });
    }

    fs.writeFileSync(cacheFilename, html);
    return { html, htmlIsFromCache: false, error: null };
}

export const toTitleCase = (str: string) => {
    return str.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

export const readMdFieldsFile = async ({ fileName }: { fileName: string }): Promise<ErrorOrFields<{ fields: {[key: string]: any} }>> => {
    if (!fs.existsSync(fileName)) {
        return { fields: {}, error: null };
    }
    const lines = fs.readFileSync(fileName, 'utf8').toString().split('\n');

    const fields = {};
    for (const line of lines) {
        const splitterPoint = line.indexOf(':');
        if (!splitterPoint) {
        continue;
        }
        const key = line.substring(0, splitterPoint).trim();
        const value = line.substring(splitterPoint + 1).trim();
        if (key && value) {
            fields[key] = value.trim();
        }
    }
    return { fields, error: null };
}

export const ensureFieldsInMdFieldsFile = async ({ fileName, fields }: { fileName: string, fields: {[key: string]: any} }): Promise<ErrorOrFields<{ }>> => { 
   if (fs.existsSync(fileName)) {
    const { fields: existingFields, error } = await readMdFieldsFile({ fileName });
    if (error) {
        return { error };
    }

    const allFields = { ...existingFields, ...fields };
    await writeMdFieldsFile({ fileName, fields: allFields });
    return {error:null};
   } else {
    await writeMdFieldsFile({ fileName, fields });
    return {error:null};
   }


}

const writeMdFieldsFile = async ({ fileName, fields }: { fileName: string, fields: {[key: string]: any} }): Promise<ErrorOrFields<{ }>> => { 
    let content = '';
    for (const key of Object.keys(fields)) {
        const value = fields[key];
        if (value === null) {
            continue;
        }
        content += `${key}: ${value}\n`;
    }

    fs.writeFileSync(fileName, content);
};

export const findFilesInDirectory = async ({ directory }: { directory: string }): Promise<ErrorOrFields<{ files: string[] }>> => {
    const files = fs.readdirSync(directory);

    // make each filename absolute  
    const absoluteFiles = files.map(file => path.join(directory, file));

    return { files: absoluteFiles, error: null };
};

export const keepFilesWithoutRequiredFields = async ({ files, requiredFields }: { files: string[], requiredFields: string[] }): Promise<ErrorOrFields<{ files: string[] }>> => {
const keptFiles :string[]= [];

for (const file of files) {
    const { fields, error } = await readMdFieldsFile({ fileName: file });
    if (error) {
        continue;
    }

    const foundFields = Object.keys(fields).filter(field => requiredFields.includes(field));
    if (foundFields.length !== requiredFields.length) { 
        keptFiles.push(file);
    }
}   

return { files: keptFiles, error: null };
}

export const keepFilesWithRequiredFields = async ({ files, requiredFields }: { files: string[], requiredFields: string[] }): Promise<ErrorOrFields<{ files: string[] }>> => {
    const keptFiles :string[]= [];
    
    for (const file of files) {
        const { fields, error } = await readMdFieldsFile({ fileName: file });
        if (error) {
            continue;
        }
    
        const foundFields = Object.keys(fields).filter(field => requiredFields.includes(field));
        if (foundFields.length === requiredFields.length) { 
            keptFiles.push(file);
        }
    }   
    
    return { files: keptFiles, error: null };
    }