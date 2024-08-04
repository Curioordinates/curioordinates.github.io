import { parseLine } from "./data-extractor";

describe("data-extractor", () => {
  it("should parse a happy line", () => {
    // given
    const line = "123 456 hello http://abc.com/go/now.jpg";

    // when
    const data = parseLine({ line });

    // then
    expect(data).toEqual({
      imageLink: "http://abc.com/go/now.jpg",
      latitude: 123,
      longitude: 456,
      remainingFragments: [],
      title: "hello ",
    });
  });

  /// todo field starting with number may be an issue (eg treated as latitude.)

  it("should parse a happy csv", () => {
    // given
    const line =
      "51.20091970111289,-1.1750012210152776,Witchfest Pagan Festival (16-19 August 2024),https://witchfest.net/events/witchfest-pagan-festival/";

    // when
    const data = parseLine({ line });

    // then
    expect(data).toEqual({
      imageLink: "http://abc.com/go/now.jpg",
      latitude: 123,
      longitude: 456,
      remainingFragments: [],
      title: "hello ",
    });
  });

  it("should parse a happy csv", () => {
    // given
    const line =
      "51.20091970111289,-1.1750012210152776,Witchfest Pagan Festival (16-19 August 2024),https://witchfest.net/events/witchfest-pagan-festival/";

    // when
    const data = parseLine({ line });

    // then
    expect(data).toEqual({
      imageLink: "http://abc.com/go/now.jpg",
      latitude: 123,
      longitude: 456,
      remainingFragments: [],
      title: "hello ",
    });
  });

  it("should parse real tsv line", () => {
    // given
    const line = "51.35885\t-1.07528\tCalleva Atrebatum(Silchester)";

    // when
    const data = parseLine({ line });

    // then
    expect(data).toEqual({
      latitude: 51.35885,
      longitude: -1.07528,
      remainingFragments: [],
      title: "Calleva Atrebatum(Silchester)",
    });
  });

  it("should parse real wikidata line", () => {
    // given
    const line = "Point(5.71877 50.59213)	Nail Linden of Olne";

    // when
    const data = parseLine({ line });

    // then
    expect(data).toEqual({
      latitude: 150.863055555,
      link: "http://www.wikidata.org/entity/Q3104726",
      longitude: -34.671805555,
      remainingFragments: [],
      title: "Kiama Blowhole",
    });
  });
});

export const m = 1;
