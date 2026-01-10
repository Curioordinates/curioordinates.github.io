
export interface ParsedParts {
    locationAsText?: string | null,
    latitude?: number | null,
    longitude?: number | null,
    textFragments: string[]
    links: string[],
    tags?: string ,
};

const findLocationAsText = (parts: string[], result: ParsedParts): string[] => {
    const newParts: string[] = [];
    for (const part of parts) {
        const atIndex = part.indexOf(' @ ');
        if (atIndex !== -1) {
            const parts = part.split(' @ ');
            newParts.push(parts[0]);
            result.locationAsText = parts[1];
        } else if (part.startsWith('@')) {
            // the place is also the description
            const text = part.substring(1).trim();
            newParts.push(text);
            result.locationAsText = text;
        } else {
            newParts.push(part);
        } 

    }
    return newParts;
}


const cleanAndAddPart = (part:string, parts: string[]) => {
   // remove any comma separators from start or end
   if (part.startsWith(',') || part.startsWith('\t') || part.startsWith('`') ) {
    part = part.substring(1).trim();
   }
   if (part.endsWith(',') || part.endsWith('\t') || part.endsWith('`') ) {
    part = part.substring(0, part.length - 1).trim();
   }
   if (part.length === 0) {
    return;
   }
   parts.push(part);
    
}

const findPoints = (parts: string[], result: ParsedParts): string[] => {
    const newParts: string[] = [];
    for (const part of parts) {
        const pointMatch = part.match(/Point\(-?\d+(\.\d+)? -?\d+(\.\d+)?\)/);
        if (pointMatch && (pointMatch.index || pointMatch.index === 0)) {
            const left = part.substring(0, pointMatch.index).trim();
            const right = part.substring(pointMatch.index + pointMatch[0].length).trim();
            cleanAndAddPart(left, newParts);
            cleanAndAddPart(right, newParts);
            
            const pointBlock = pointMatch[0].trim().replace('Point(', '').replace(')', '');
            const pointParts = pointBlock.split(' ').map(part => part.trim());

            // Note standard La Lo are swapped.
            result.latitude = parseFloat(pointParts[1]);
            result.longitude = parseFloat(pointParts[0]);
        } else {
            newParts.push(part);
        }
    }
    return newParts;
}



const findCoords = (parts: string[], result: ParsedParts): string[] => {
    const newParts: string[] = [];
    for (const part of parts) {
        const coordMatch = part.match(/^-?\d+(\.\d+)? ?,? ?-?\d+(\.\d+)?/);
        if (coordMatch && (coordMatch.index || coordMatch.index === 0)) {
            const coordParts = coordMatch[0].split(',').map(part => part.trim());

            const left = part.substring(0, coordMatch.index).trim();
            const right = part.substring(coordMatch.index + coordMatch[0].length).trim();
            cleanAndAddPart(left, newParts);
            cleanAndAddPart(right, newParts);
            result.latitude = parseFloat(coordParts[0]);
            result.longitude = parseFloat(coordParts[1]);
        } else {
            newParts.push(part);
        }
    }
    return newParts;
}

const findLinks = (parts: string[], result: ParsedParts): string[] => {
    const newParts: string[] = [];

    for (const part of parts) {
       const linkMatch = part.match(/https?:\/\/[^ \t`]+/);
       if (linkMatch && (linkMatch.index || linkMatch.index === 0)) {
        // find the left and right of the link
        const left = part.substring(0, linkMatch.index).trim();
        const right = part.substring(linkMatch.index + linkMatch[0].length).trim();
        
        cleanAndAddPart(left, newParts);
        cleanAndAddPart(right, newParts);

        let link = linkMatch[0];
        if (link.endsWith(',') || link.endsWith('\t') || link.endsWith('`') ) {
            // remove any trailing comma separators
            link = link.substring(0, link.length - 1).trim();
        }

        result.links.push(link);
       } else {
        newParts.push(part);
       }

       
    } 
    return newParts;
}

const matchesNumber = (text:string): boolean => {
    return /^-?\d+(\.\d+)?$/.test(text);
}

export const splitLine = (line: string): [Error, null] | [null, ParsedParts] => {
    let workingLine = line;
    const result: ParsedParts = {
        textFragments: [],
        links: [],
    }

    // tags always at the end
    const tagStart = line.indexOf(' #');
    if (tagStart !== -1) {
        result.tags = workingLine.substring(tagStart).trim();    
        workingLine = workingLine.substring(0, tagStart).trim();
    } 

    // explicit separators can be ` or \t or , (although , is way to ambiguous)
    let parts = workingLine.split('\t');


    if (parts.length > 1) {
        if (matchesNumber(parts[0]) && matchesNumber(parts[1])) {
            result.latitude = parseFloat(parts[0]);
            result.longitude = parseFloat(parts[1]);
            parts = parts.slice(2);
        }
    }


    // parts may still be 1 - but thats fine.
    parts = findLinks(parts, result)


    // find point(n,n)
    parts = findPoints(parts, result);

    // find coords
    parts = findCoords(parts, result);


    if ((!result.latitude || result.latitude === 0) && ( !result.longitude || result.longitude === 0)) {
        parts = findLocationAsText(parts, result);
    }
    result.textFragments = parts;
    return [null, result];

}
