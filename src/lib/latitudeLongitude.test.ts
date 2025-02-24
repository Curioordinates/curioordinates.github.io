import { latitudeLongitudeFromOSGrid } from "./latitudeLongitude";

describe("latlong", () => {
  it("should work", () => {
    const gridRef = "SO387304";

    const v = latitudeLongitudeFromOSGrid(gridRef);

    expect(v.latitude).toBe(51.96868);

    expect(v.longitude).toBe(-2.89369);
  });
});
