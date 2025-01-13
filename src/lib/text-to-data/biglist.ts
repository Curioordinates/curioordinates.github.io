import { callLLM } from "./local-ollama";
import * as path from 'path';
import * as fs from 'fs';


const cleanName = (name: string): string => {

    let result = name;

    const noteIndex = result.indexOf('(Note:');
    if (noteIndex !== -1) {
        result = result.substring(0, noteIndex);
    }

    if (result.startsWith('-')) {
        result = result.substring(1).trim();
    }

    return result.trim();
}

async function  go () {

    console.log('here we go');

    const result = await callLLM('phi4:14b', 'Answer the following question as a simple un-numbered list, one per line','List the countries of the world');


    for (let country of result.message.split('\n')) {
        if (country.trim() === '') {
            continue;
        }
        country = cleanName(country);
        console.log(country);

        if (
            country != "United Kingdom" &&
            country != "United Kingdom of Great Britain and Northern Ireland"
        ) {
            continue;
        }

            const result = await callLLM(
                "phi4:14b",
                "Answer the following question as a simple un-numbered list, one per line - without any notes or preamble.",
                "List the regions of " + country
            );

            for (let region of result.message.split('\n')) {
                if (region.trim() === '') {
                    continue;
                }
                region = cleanName(region);

                console.log(`${country} >> ${region}`);

                const result = await callLLM(
                    "phi4:14b",
                    "Answer the following question as a simple un-numbered list, one per line - without any notes or preamble. If you do not know of any - respond with 'no-data-available'",
                    "List the cities of " +region +', ' + country
                );

                for (let city of result.message.split("\n")) {
                    if (city.startsWith('-')) {
                        city=city.substr(1).trim();
                    }
                    city = cleanName(city);
                    if (city.trim() === "") {
                        continue;
                    }
                    
                    const pathParts = [country, region, city].map((item) =>
                        encodeURIComponent(item.trim())
                    );
                    const filePath = path.join(
                        "/Users/Shared/data/llm-extract-world",
                        ...pathParts
                    );
                    const fileName = path.join(filePath, "most-haunted.txt");
                    if (fs.existsSync(fileName)) {
                        console.log('skipping:' +fileName);
                        continue;
                    }


                    console.log('??? ' + fileName);
                    
                    const result = await callLLM(
                        "phi4:14b",
                        "Answer the following question as a simple un-numbered list, one per line - without any notes or preamble.",
             //           "List any ghosts you have heard about - based in " + city + ","  + country
                        "What is said to be the most haunted place in " + city + ", "  + region
                    );

                    fs.mkdirSync(filePath, {recursive:true});
                    fs.writeFileSync(fileName, result.message);
                }

            }
    }
}
go();