export function latLngsToGeoJSON(latlngs) {
  return {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [[...latlngs.map(([lat, lng]) => [lng, lat])]],
    },
    properties: {},
  };
}