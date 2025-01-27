import * as fs from 'fs';
import { FactionParams } from '../faction-types';

let Parser = require('rss-parser');
let parser = new Parser();

// take a specific input file and location for output files
export const runAction = async ({input,output}: FactionParams): Promise<void> => {
    const fileContent = await input.readText();

    console.log('got: ' + fileContent);

   const feed = await parser.parseURL(fileContent);

   // This will per part of the history for the output.
   output.addHistory({
    type:'rss-feed-url',
    url: fileContent.trim(),
   });

   await output.writeJson({
        name: fileContent.trim(), 
        data: feed, 
   });

   // console.log(JSON.stringify(feed,null,3));
}