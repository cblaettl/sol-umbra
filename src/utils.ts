import { BoxGeometry, MeshPhongMaterial, Mesh, ConeGeometry, CylinderGeometry, MeshBasicMaterial, Scene, SphereGeometry } from "three";

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

	const deltaX = 380.0;
	const deltaY = 0.0;
	const deltaZ = -180.0;

	const deltaLng = 0.004933;
	const deltaLat = 0.001551;

	const rx = deltaX / deltaLng;
	const ry = deltaY / deltaLat;  // This is 0
	const rz = deltaZ / deltaLat;

	const x = (lng - baseLng) * rx;
	const y = (lat - baseLat) * ry;
	const z = (lat - baseLat) * rz;

	return { x, y, z };
}

export const drawMarker = (scene: Scene, x: number, y: number) => {
	const z = 10// 2. Create the 3D Map Pin

	// Bottom part - Cone
	let coneHeight = 2;
	let coneRadius = 0.5;
	let coneGeometry = new ConeGeometry(coneRadius, coneHeight, 32);
	let coneMaterial = new MeshBasicMaterial({ color: 0xff0000 }); // Red color
	let cone = new Mesh(coneGeometry, coneMaterial);
	scene.add(cone);

	// Top part - Sphere
	let sphereRadius = coneRadius;
	let sphereGeometry = new SphereGeometry(sphereRadius, 32, 32);
	let sphereMaterial = new MeshBasicMaterial({ color: 0xff0000 }); // Red color
	let sphere = new Mesh(sphereGeometry, sphereMaterial);
	sphere.position.y = coneHeight / 2;  // Position the sphere on top of the cone
	scene.add(sphere);

	// 3. Position the Map Pin
	const combinedHeight = (coneHeight / 2) + sphereRadius; // Adjust for the half height of the cone and the radius of the sphere
	cone.position.set(x, y + combinedHeight - sphereRadius, z);
	sphere.position.set(x, y + combinedHeight, z);
}