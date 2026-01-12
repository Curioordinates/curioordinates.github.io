import { defaultMaxListeners } from "events";
import { parseEntryFields } from "./ultimate-line-parser";


const resolveLocation = (fields) => {
    if (fields.locationAsText === 'Ravens Bowl, The Wrekin, Shropshire') {
        fields.latitude = 52.66829;
        fields.longitude = -2.55115;
        // fields.locationAsText = null; no need to null the source locationAsText
    }
}

describe('ultimate-line-parser', () => {


    it('should handle long lines', () => {
const line = `36.825382092581606, 28.623420283271408,Kaunos,https://en.wikipedia.org/wiki/Kaunos, The amphitheatre at Kaunos, built into the slope of the acropolis, reflects both Hellenistic and Roman architectural influences, featuring a 75-meter diameter and seating for around 5000 spectators. It is well-preserved and still occasionally hosts performances today.`

        const [error, data] = parseEntryFields(line);
        expect(error).toBeNull();
        expect(data).toEqual(expect.objectContaining({
            latitude: 36.825382092581606,
            longitude: 28.623420283271408,
            title: "Kaunos",
            link: "https://en.wikipedia.org/wiki/Kaunos",
            details: "The amphitheatre at Kaunos, built into the slope of the acropolis, reflects both Hellenistic and Roman architectural influences, featuring a 75-meter diameter and seating for around 5000 spectators. It is well-preserved and still occasionally hosts performances today.",
        }));
    });

    it('Should not match 1592 as 15 92 coordinates', () => {
        const line = `50.81918695243874, 0.33419154454573485,Joan of Navarre,https://en.wikipedia.org/wiki/Joan_of_Navarre,_Queen_of_England,In 1419, Joan of Navarre was imprisoned at Pevensey Castle after her confessor accused her of plotting to kill King Henry V with witchcraft. Her fortune was seized, and she remained in captivity until her release in 1422."`
    
        const [error, data] = parseEntryFields(line);
        expect(error).toBeNull();
        expect(data).toEqual(expect.objectContaining({
            latitude: 50.81918695243874,
            longitude: 0.33419154454573485,
            locationAsText: null,
            tags: null,
            title: "Joan of Navarre",
            link: "https://en.wikipedia.org/wiki/Joan_of_Navarre,_Queen_of_England",
            details: "In 1419, Joan of Navarre was imprisoned at Pevensey Castle after her confessor accused her of plotting to kill King Henry V with witchcraft. Her fortune was seized, and she remained in captivity until her release in 1422.",
        }));
    
    });

    it('Should handle troublesum tab parsing', () => {
        const line = `50.90996	-0.60424	Bignor Hill Dragon	http://www.sussexarch.org.uk/saaf/dragon.html	"A large dragon had its den on Bignor Hill, and marks of its folds were to be seen on the hill."`

        const [error, data] = parseEntryFields(line);
        expect(error).toBeNull();
        expect(data).toEqual(expect.objectContaining({
            latitude: 50.90996,
            longitude: -0.60424,
            title: "Bignor Hill Dragon",
            link: "http://www.sussexarch.org.uk/saaf/dragon.html",
            details: "A large dragon had its den on Bignor Hill, and marks of its folds were to be seen on the hill.",
        }));
    });


 
 
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
            title: "The Raven's Bowl",
            link: "https://linky.com",
            details: "The bowl is cool",
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
            details: "Hotel Parq Central, once a psychiatric facility and later Memorial Hospital, is known for unsettling paranormal activity tied to its medical past. Reports include apparitions—most notably a woman seen watching from the upper right wing—and bedsheets being pulled off during the night.",
            title: "Hotel Parq Central",
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
            title: "Battle of Focșani (1789)",
            link: "http://www.wikidata.org/entity/Q1025134",
            details: null,
            locationAsText: null,
            tags: null,
        }));
    });

    // Ravens bowl - 52.66829, -2.55115
});