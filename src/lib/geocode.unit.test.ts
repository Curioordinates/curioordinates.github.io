import { geoLookup } from "./geocode";

describe("geocode", () => {
  jest.setTimeout(999999999);

  it("should work for the happy path", async () => {
    // given
    const address = "Novotel London West";

    // when
    const result = await geoLookup(address);

    // then
    console.log(result);
  });
});
