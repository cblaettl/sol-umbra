import { BoxGeometry, MeshPhongMaterial, Mesh } from "three";

export const createBox = (width: number, height: number, depth: number, color = 0xffffff) => {
	var geometry = new BoxGeometry( width, height, depth );
	var material = new MeshPhongMaterial( { color: color } );
	var cube = new Mesh(geometry, material);
	cube.castShadow = true;
	cube.receiveShadow = true;
	return cube;
}

export const latLngToCartesian = (lng: number, lat: number) => {
	const baseLng = 7.440082;
	const baseLat = 46.941836;

	const deltaX = 53.0;
	const deltaY = 0.0;
	const deltaZ = 52.0;

	const deltaLng = 0.000705;
	const deltaLat = -0.000469;

	const rx = deltaX / deltaLng;
	const ry = deltaY / deltaLat;  // This is 0
	const rz = deltaZ / deltaLat;

	const x = (lng - baseLng) * rx;
	const y = (lat - baseLat) * ry;
	const z = (lat - baseLat) * rz;

	return { x, y, z };
}
