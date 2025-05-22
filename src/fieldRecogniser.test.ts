import { fieldRecogniser, isTitleCase, titlesMatch } from "./fieldRecogniser";

describe("fieldRecogniser", () => {
  it("should work", () => {
    const expectUnknown = fieldRecogniser("The cat in the hat");
    expect(expectUnknown.type).toBe("unknown");

    const expectTitle = fieldRecogniser("The Cat In The Hat");
    expect(expectTitle.type).toBe("title");

    const expectAddress = fieldRecogniser(
      "Newry Beach, Beach Road, Holyhead LL65 1YF"
    );
    expect(expectAddress.type).toBe("address");
    if (expectAddress.type === "address") {
      expect(expectAddress.lines).toEqual([
        "Newry Beach",
        "Beach Road",
        "Holyhead",
      ]);
      expect(expectAddress.postcode).toBe("LL65 1YF");
    }

    const anotherAddress =
      fieldRecogniser(`8 High Street, South Queensferry, Edinburgh,
      EH30 9PP`);
  });

  it("should recognise addresses", () => {
    let expectedAddress = fieldRecogniser(
      "High street, Chalfont St Peters, Gerrards Cross, SL9 9RA"
    );
    expectedAddress = fieldRecogniser("Leek Road, Warslow, SK17 0JN");
    console.log("f");

    expectedAddress = fieldRecogniser(
      "Norman Cross Jct 16, A1(M), Peterborough PE7 3TB"
    );

    expectedAddress = fieldRecogniser(
      "Wigglesworth, Wigglesworth, Skipton,BD23 4RJ"
    );

    expectedAddress = fieldRecogniser(
      "High St, Dorchester on thames, OX10 7HH"
    );

    let v = titlesMatch("The Carpenters Arms", `The Carpenter's arms`);

    v = titlesMatch("The Scole Inn", "Scole Inn Hotel");
    console.log(v);
  });

  it("should match titles", () => {
    let a = isTitleCase("The Cartologist at the Garden House");
    let b = isTitleCase("The Cartologist at The Garden House Inn");

    titlesMatch(
      "The Cartologist at the Garden House",
      "The Cartologist at The Garden House Inn"
    );
  });
});
