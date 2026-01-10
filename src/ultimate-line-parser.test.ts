import { parseEntryFields } from "./ultimate-line-parser";


const resolveLocation = (fields) => {
    if (fields.locationAsText === 'Ravens Bowl, The Wrekin, Shropshire') {
        fields.latitude = 52.66829;
        fields.longitude = -2.55115;
        // fields.locationAsText = null; no need to null the source locationAsText
    }
}

describe('ultimate-line-parser', () => {
    it('should parse a happy line', () => {
        // given
        // note the location isn't just 'The Wrekin, shropshire' as Raven's Bowl is a specific location.
        const line = "The Raven's Bowl @ Ravens Bowl, The Wrekin, Shropshire https://linky.com The bowl is cool #giant #folklore";

        // when
        const [error, data] = parseEntryFields(line);

        // then
        expect(error).toBeNull();
        expect(data).toEqual(expect.objectContaining({
            locationAsText: "Ravens Bowl, The Wrekin, Shropshire",
            latitude: null,
            longitude: null,
            label: "The Raven's Bowl",
            link: "https://linky.com",
                description: "The bowl is cool",
                tags: '#giant #folklore'
        }));

        resolveLocation(data);

        expect(data).toEqual(expect.objectContaining({
            latitude: 52.66829,
            longitude: -2.55115,
        }));
    });

    it ('should handle the penultimate-style line', () => {
        // given
        const line = "35.082575, -106.63806`Hotel Parq Central`https://www.hauntedrooms.com/new-mexico/albuquerque/haunted-places/haunted-hotels/hotel-parq-central`Hotel Parq Central, once a psychiatric facility and later Memorial Hospital, is known for unsettling paranormal activity tied to its medical past. Reports include apparitions—most notably a woman seen watching from the upper right wing—and bedsheets being pulled off during the night.";

        // when
        const [error, data] = parseEntryFields(line);``
        expect(error).toBeNull();
        expect(data).toEqual(expect.objectContaining({
            latitude: 35.082575,
            longitude: -106.63806,
            link: "https://www.hauntedrooms.com/new-mexico/albuquerque/haunted-places/haunted-hotels/hotel-parq-central",
            description: "Hotel Parq Central, once a psychiatric facility and later Memorial Hospital, is known for unsettling paranormal activity tied to its medical past. Reports include apparitions—most notably a woman seen watching from the upper right wing—and bedsheets being pulled off during the night.",
            label: "Hotel Parq Central",
            locationAsText: null,
            tags: null,
        }));
        
        resolveLocation(data);
        
    });

    it('Should handle basic SparQL output', () => {
        // given
        const line = "http://www.wikidata.org/entity/Q1025134	Point(27.179722222 45.7)	Battle of Focșani (1789)";

        // when
        const [error, data] = parseEntryFields(line);
        expect(error).toBeNull();
        expect(data).toEqual(expect.objectContaining({
            longitude: 27.179722222,
            latitude: 45.7,
            label: "Battle of Focșani (1789)",
            link: "http://www.wikidata.org/entity/Q1025134",
            description: null,
            locationAsText: null,
            tags: null,
        }));
    });

    // Ravens bowl - 52.66829, -2.55115
});