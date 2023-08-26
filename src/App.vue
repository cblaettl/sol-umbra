<script setup lang="ts">
import { onMounted, ref } from "vue";
import { IfcViewerAPI } from "web-ifc-viewer";
import RoundSlider from "vue-three-round-slider";
import { BoxGeometry, Color, Mesh, MeshPhongMaterial, PCFSoftShadowMap, Vector2, Vector3 } from "three";
import { getUV } from "./services/weather";
import { SunLight } from "./sun";
import POIAutocomplete from "./component/POIAutocomplete.vue";

const container = ref<HTMLDivElement | null>(null);


let viewer: IfcViewerAPI

const createBox = (width: number, height: number, depth: number, color = 0xffffff) => {
	var geometry = new BoxGeometry( width, height, depth );
	var material = new MeshPhongMaterial( { color: color } );
	var cube = new Mesh(geometry, material);
	cube.castShadow = true;
	cube.receiveShadow = true;
	return cube;
}

const sun = new SunLight(
  // Bern
  new Vector2( 46.9480, 7.4474 ),
  // TODO: Find north
  new Vector3( 0.0, 0.0, 1.0 ),
  new Vector3( -1.0, 0.0, 0.0 ),
  new Vector3( 0.0, -1.0, 0.0 )
);
const date = new Date();
const uv = ref(0)

onMounted(async () => {
  if (!container.value) {
    return
  }

  uv.value = await getUV()

  viewer = new IfcViewerAPI({
    container: container.value,
    backgroundColor: new Color(0xffffff),
  });

  viewer.IFC.setWasmPath("node_modules/web-ifc/")
  viewer.IFC.loader.ifcManager.applyWebIfcConfig({
    USE_FAST_BOOLS: true,
    COORDINATE_TO_ORIGIN: true
  });

  // viewer.axes.setAxes();
  // viewer.grid.setGrid();

  viewer.context.renderer.renderer.shadowMap.enabled = true;

  // const ground = createBox( 50.0, 1.0, 50.0, 0x99ff99 );
  // ground.position.set( 0.0, 0.0, 0.0 );
  // viewer.context.scene.add( ground );
  // // Cube in the middle
  // const cube = createBox( 5.0, 5.0, 5.0 );
  // cube.position.set( 0.0, 5.0, 0.0 );
  // viewer.context.scene.add( cube );
  // // North pole indicator
  // const northIndicator = createBox( 2.0, 2.0, 8.0, 0xff0000 );
  // northIndicator.position.set( 0.0, 1.0, 20.0 );
  // viewer.context.scene.add( northIndicator );

  // Add an ambient light
  // viewer.context.scene.add(new AmbientLight( 0x333333));

  window.ondblclick = async () => {
    const item = await viewer.IFC.selector.pickIfcItem(true)

    if (!item) {
      return
    }

    const result = await viewer.IFC.getProperties(item.modelID, item.id, false, true);

    console.log({item, result})

    const coords = result["ObjectPlacement"]["RelativePlacement"]["Location"]["Coordinates"]

    const x = coords[0].value
    const y = coords[1].value
    const z = coords[2].value

    if (!x || !y || !z) {
      console.log('coordinates not available')
      return
    }

    console.log({x, y, z})
  };
  // window.onmousemove = () => viewer.IFC.selector.prePickIfcItem();
  viewer.clipper.active = true;

  viewer.context.renderer.renderer.shadowMap.enabled = true;
  viewer.context.renderer.renderer.shadowMap.type = PCFSoftShadowMap; // default THREE.PCFShadowMap

  // sun.shadow.mapSize.width = 51200; // default is 512
  // sun.shadow.mapSize.height = 51200; // default is 512
  // sun.shadow.camera.near = 0.5; // default is 0.5
  // sun.shadow.camera.far = 50000; // default is 500
})

const changed = async (changed: Event) => {
  if (!changed.target) {
    return
  }

  const input = changed.target as HTMLInputElement;

  if (!input.files || !input.files.length) {
    return
  }

  const file = input.files[0];

  const ifcURL = URL.createObjectURL(file);

  await viewer.IFC.loadIfcUrl(ifcURL);

  viewer.context.scene.scene.castShadow = true
  viewer.context.scene.scene.children.forEach(c => {
    if (c.type === "Mesh") {
      c.castShadow = true
      c.receiveShadow = true
    }
  })

  viewer.context.scene.add(sun)

	sun.directionalLight.shadow.camera.right = 300.0;
	sun.directionalLight.shadow.camera.left = -30.0;
	sun.directionalLight.shadow.camera.top = 30.0;
	sun.directionalLight.shadow.camera.bottom = -30.0;

	sun.updateOrientation(date);
	sun.updateDirectionalLight();
}

const goTo = () => {
  // Cube in the middle
  const cube = createBox(5.0, 5.0, 5.0, 0xff0000);
  cube.position.set(0.0, 5.0, 0.0);
  viewer.context.scene.add(cube);

  viewer.context.ifcCamera.cameraControls.setLookAt(50, 50, 50, 0, 5, 0, true)
}

const format = (event: any) => {
  var minutes = +event.value;
  var hours = Math.floor(minutes / 60);
  minutes = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

const onPOISelected = (coordinates: any) => {
  // todo move camera to position
  console.log("coordiantes:");
  console.table(coordinates);
}
</script>

<template>
  <round-slider
    min="360"
    max="1260"
    end-angle="180"
    line-cap="round"
    radius="100"
    rangeColor="#FFDF22"
    handleShape="dot"
    :tooltipFormat="format"
  />
  <input @change="changed" type="file" />
  <POIAutocomplete @selectPoi="onPOISelected" />
  <button @click="goTo">Go to place</button>
  <div>{{ uv }} W/m²</div>
  <div ref="container" style="width: 100%; height: 90vh;"></div>
</template>
