<script setup lang="ts">
import { onMounted, ref } from "vue";
import { IfcViewerAPI } from "web-ifc-viewer";
import RoundSlider from "vue-three-round-slider";
import { Color, PCFSoftShadowMap, Vector2, Vector3 } from "three";
import { getUV } from "./services/weather";
import { SunLight } from "./sun";
import POIAutocomplete from "./component/POIAutocomplete.vue";
import { createBox } from "./utils";

const IFC_MODEL_URL = "/3D_Stadtmodell.ifc"

const container = ref<HTMLDivElement | null>(null);

let viewer: IfcViewerAPI

const sun = new SunLight(
  // Bern
  new Vector2( 46.9480, 7.4474 ),
  // TODO: Find north
  new Vector3( 0.0, 0.0, 1.0 ),
  new Vector3( -1.0, 0.0, 0.0 ),
  new Vector3( 0.0, -1.0, 0.0 )
);

const shadowEnabled = ref(false)

const date = new Date();
const uv = ref(0)

onMounted(async () => {
  if (!container.value) {
    return
  }

  viewer = new IfcViewerAPI({
    container: container.value,
    backgroundColor: new Color(0xffffff),
  });

  viewer.IFC.setWasmPath("node_modules/web-ifc/")
  viewer.IFC.loader.ifcManager.applyWebIfcConfig({
    USE_FAST_BOOLS: true,
    COORDINATE_TO_ORIGIN: true
  });

  await viewer.IFC.loadIfcUrl(IFC_MODEL_URL);

  // viewer.context.renderer.renderer.shadowMap.enabled = true;
  viewer.context.scene.scene.castShadow = true
  viewer.context.scene.scene.children.forEach(c => {
    if (c.type === "Mesh") {
      c.castShadow = true
      c.receiveShadow = true
    }
  })

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

  uv.value = await getUV()
})

const toggleShadow = () => {
  if (shadowEnabled.value) {
    viewer.context.scene.remove(sun)
  } else {
    viewer.context.scene.add(sun)

    sun.directionalLight.shadow.camera.right = 300.0;
    sun.directionalLight.shadow.camera.left = -30.0;
    sun.directionalLight.shadow.camera.top = 30.0;
    sun.directionalLight.shadow.camera.bottom = -30.0;

    sun.updateOrientation(date);
    sun.updateDirectionalLight();
  }

  shadowEnabled.value = !shadowEnabled.value
}

const goTo = () => {
  // Cube in the middle
  const cube = createBox(5.0, 5.0, 5.0, 0xff0000);
  cube.position.set(0.0, 5.0, 0.0);
  viewer.context.scene.add(cube);

  viewer.context.ifcCamera.cameraControls.setLookAt(50, 50, 50, 0, 5, 0, true)
}

const format = (event: { value: number }) => {
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

const setTime = (event: { value: number }) => {
  let minutes = +event.value;
  const hours = Math.floor(minutes / 60);
  minutes = minutes % 60;

  date.setMinutes(minutes)
  date.setHours(hours)

  console.log({ minutes, hours })

	sun.updateOrientation(date);
	sun.updateDirectionalLight();
}
</script>

<template>

  <div class="wrapper">
    <div ref="container" class="container"></div>

    <div class="slider">
      <round-slider
        min="360"
        max="1260"
        end-angle="180"
        line-cap="round"
        radius="100"
        rangeColor="#FFDF22"
        handleShape="dot"
        :tooltipFormat="format"
        :change="setTime"
      />
    </div>

    <nav>
      <POIAutocomplete @selectPoi="onPOISelected" />
      <div class="controls">
        <button @click="goTo">Go to place</button>
        <button @click="toggleShadow">Toggle shadow {{ shadowEnabled ? 'off' : 'on' }}</button>

      </div>
      <div>{{ uv }} W/m²</div>
    </nav>
  </div>
</template>

<style scoped>
.wrapper {
  height: 100vh;
  width: 100vw;
  position: relative;
}

nav {
  padding: 1rem;
  border-radius: 0 0 10px 10px;

  position: absolute;
  top: 0;
  background: rgb(24, 24, 24);
  box-shadow: rgba(100, 100, 111, 0.4) 0px 7px 29px 0px;
  width: calc(100% - 2rem);
}

.slider {
  width: 100%;
  position: absolute;
  bottom: 0;

  display: flex;
  justify-content: center;
}

.container {
  height: 100%;
  width: 100%;
  position: absolute;
}

.controls {
  display: flex;
  gap: 1rem;
}
</style>