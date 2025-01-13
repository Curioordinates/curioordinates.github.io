import { find_all_urls, openstreetmapLookup, ttdExpand } from "./api";


(async () => {
    const place = await openstreetmapLookup('Norwich castle, norwich, uk');

    console.log(JSON.stringify(place, null, 3));

    const result = await ttdExpand('Q42');
    console.log(JSON.stringify(result, null, 3));

    const biz = await ttdExpand("https://maps.app.goo.gl/BSAvxC7hkz8VJnZk7");
console.log(JSON.stringify(biz));


console.log('egh');
    const biz2 = await ttdExpand(
        "https://maps.app.goo.gl/r5Vrgy71Jyq4M3kv5"
    );
    console.log(JSON.stringify(biz2));


    const items = find_all_urls('agoekaegko https://www.go.com/sos and http://www.bob');
    console.log(JSON.stringify(items,null,3));
})();