import { getFilesIn, MDValue, readMDFile } from "./md-file-reader";
import Parser from "rss-parser";
import * as fs from 'fs';
import * as path from 'path';
import { runProcess } from "./run-exe";

interface TitleField { 
    title: string,
}

interface SubjectUrlField { 
    subjectUrl: string,
}

interface BodyField { 
    body: string,
}

interface GuidField {
    guid: string,
}

const getUrlExtension = (url:string): 'mp3' | null => {

    if (url.toLocaleLowerCase().includes('.mp3')) {
        return 'mp3';
    }
    return null;

}


const formatMultilineValue = (input:string): string => {
    const lines = input.split('\n');
    if (lines.length === 1) {
        return input;
    }

    return lines.map(line => `  ${line}`).join('\n').trim();
}

const dataPresent = (item : MDValue[] | undefined) : boolean => item && item.length > 0 ? true : false;


async function processPodcastEpisodes() {
    const episodeDirectory =
        "/Users/cholden/obsidian-data/rdf/podcast-episodes";

    const [error, files] = await getFilesIn({
         directory: episodeDirectory,
    });

    if (error) {
        throw error;
    }

    for (const file of files) {
        if (! file.endsWith('.md')) {
            continue;
        }
        console.log(file);
        const [error, mdData] = readMDFile(file)
        
        if (error) {
            console.error(error)
            continue;
        }

//        console.log('EPISODE: ' + JSON.stringify(mdData, null, 3));
//        console.log(mdData.subject);
        if (dataPresent(mdData.subjectUrl)) {
            console.log('subject url is present.');
            console.log(JSON.stringify(mdData.subjectFile));

            // there is a subject (eg MP3 file)
            if (!dataPresent(mdData.subjectFile)) {
                // file hasn't been downloaded yet.
                console.log('Downloading subject file...');
            

                const audioFileUrl = mdData.subjectUrl[0].text;
                const response = await fetch (audioFileUrl);
                if (!response.ok) {
                    return [response,null];
                }

                const baseFileName =  `${encodeURIComponent(mdData.guid[0].text)}.${getUrlExtension(audioFileUrl)}`
                const fullFileName = path.join(
                    "/Users/cholden/obsidian-data/rdf/podcast-episodes",
                    baseFileName,
                );
                fs.writeFileSync(fullFileName,Buffer.from( await response.arrayBuffer()));
                console.log('wrote file to : ' + fullFileName);

                const newLine = `subjectFile: ./${baseFileName}`;
                console.log('Updating episode file - ' + file);
                fs.appendFileSync(file, `\n${newLine}`);
            }  else {
                console.log('.subjectFile - already present!');
            }
        }
    }
}

async function processPodcastAudio() {
    const episodeDirectory =
        "/Users/cholden/obsidian-data/rdf/podcast-episodes";

    const [error, files] = await getFilesIn({
        directory: episodeDirectory,
    });

    if (error) {
        throw error;
    }

    for (const file of files) {
        if (!file.endsWith(".mp3")) {
            continue;
        }
        console.log(file);
        // whisper
       await runProcess("zsh", ["/Users/cholden/bin/tts.sh", file]);
    }
}

async function processPodcasts () { 
    const [error, files] = await getFilesIn({
        directory: "/Users/cholden/obsidian-data/rdf/podcasts",
    });

    if (error) {
        throw error;
    }

    for (const file of files) {
        console.log(file);
        const [error, mdData] = readMDFile(file)
        
        if (error) {
            console.error(error)
            continue;
        }


        const index = file.lastIndexOf('/');
        const mainName = file.substring(index+1).replace('.md','');

        const feedList = mdData.feed;
        if (feedList) {
            for (const item of mdData.feed ) {
                if (item.text.startsWith('http')) {
                    console.log('- will - pull - feed:' + item.text);
                    await   processRSSFeed(item.text, async (item : TitleField & SubjectUrlField & BodyField & GuidField)=> {
                        console.log('ep: ' + JSON.stringify( item.guid));
                      //  console.log(JSON.stringify(item,null,3));


                        // write an episode file for this.
                        const episodeDirectory =
                            "/Users/cholden/obsidian-data/rdf/podcast-episodes";
                        fs.mkdirSync(episodeDirectory, {recursive:true});

                        const fileName  = path.join(episodeDirectory, `${encodeURIComponent(item.guid)}.md`);
                        
                        const content = [
                            `podcast: [[${mainName}]]`,
                            ``,
                            `title: ${item.title}`,
                            `subjectUrl: ${item.subjectUrl}`,
                            `guid: ${item.guid}`,
                            ``,
                            `body: ${formatMultilineValue(item.body)}`,
                        ].join("\n");
                        
                        try {
                            if (!fs.existsSync(fileName)) {
                                fs.writeFileSync(fileName, content);
                            }
                        } catch (e) {
                            console.log('error storing file!');
                        }


                    });
                    // xxx
                }
            }
        }

    }
}

async function processRSSFeed (feedUrl: string, episodeCallback : (item : TitleField & SubjectUrlField & BodyField & GuidField)=> Promise<void> ): Promise<void> {
    const parser = new Parser();
    const feed = await parser.parseURL(feedUrl);
    
    for (const item of feed.items) {
        if (episodeCallback) {
            episodeCallback({
                title: item.title ?? '',
                body: item.content ?? '',
                subjectUrl : item.enclosure?.url ?? '',
                guid: item.guid ?? ''

            })
        }
    }
  //  console.log(JSON.stringify(feed,null,3));
}

async function go () {
    await processPodcasts();
    await processPodcastEpisodes();
    await processPodcastAudio();
    process.exit(0);
};

go();