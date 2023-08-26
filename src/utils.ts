import { BoxGeometry, MeshPhongMaterial, Mesh } from "three";

export const createBox = (width: number, height: number, depth: number, color = 0xffffff) => {
	var geometry = new BoxGeometry( width, height, depth );
	var material = new MeshPhongMaterial( { color: color } );
	var cube = new Mesh(geometry, material);
	cube.castShadow = true;
	cube.receiveShadow = true;
	return cube;
}