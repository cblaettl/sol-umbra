export const getUV = async () => {
    // use fetch to get real value
    const response = await fetch("https://data.geo.admin.ch/ch.meteoschweiz.messwerte-globalstrahlung-10min/ch.meteoschweiz.messwerte-globalstrahlung-10min_en.json");
    const uv = await response.json();
    for (const feature of uv.features) {
        // searching hardcoded for station bern/zollikofen
        if (feature.id == "BER") {
            return feature.properties.value
        }
    }
    return -1
}