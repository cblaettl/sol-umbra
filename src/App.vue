<script setup lang="ts">
import { onMounted, ref } from "vue";
import { IfcViewerAPI } from "web-ifc-viewer";
import RoundSlider from "vue-three-round-slider";
import { Color, PCFSoftShadowMap, ReinhardToneMapping, Vector2, Vector3 } from "three";
import { getUV } from "./services/weather";
import { SunLight } from "./sun";
import POIAutocomplete from "./component/POIAutocomplete.vue";
import { drawMarker, latLngToCartesian } from "./utils";

const IFC_MODEL_URL = "/3D_Stadtmodell.ifc"

const container = ref<HTMLDivElement | null>(null);

let viewer: IfcViewerAPI

const loading = ref(true)
const progress = ref(0)

// const boundingBox = new Box3();
const sun = new SunLight(
  // Bern
  new Vector2( 46.9480, 7.4474 ),
  new Vector3( 0.0, 0.0, -1.0 ),
  new Vector3( 1.0, 0.0, 0.0 ),
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

  // viewer.axes.setAxes();
  // viewer.grid.setGrid();

  viewer.IFC.setWasmPath("node_modules/web-ifc/")
  viewer.IFC.loader.ifcManager.applyWebIfcConfig({
    USE_FAST_BOOLS: true,
    COORDINATE_TO_ORIGIN: true
  });

  viewer.context.renderer.renderer.shadowMap.enabled = true;
  viewer.context.renderer.renderer.shadowMap.type = PCFSoftShadowMap;
  viewer.context.renderer.renderer.toneMapping = ReinhardToneMapping;

  await viewer.IFC.loadIfcUrl(IFC_MODEL_URL, true, (e: ProgressEvent) => {
    progress.value = e.loaded / e.total
  });

  viewer.context.scene.scene.children.forEach(c => {
    if (c.type === "Mesh") {
      c.castShadow = true
      c.receiveShadow = true
    }
  })

  loading.value = false

  window.ondblclick = async () => {
    const item = await viewer.IFC.selector.pickIfcItem(true)

    if (!item) {
      return
    }

    const result = await viewer.IFC.getProperties(item.modelID, item.id, false, true);

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
  viewer.clipper.active = true;

  uv.value = await getUV()
})

const toggleShadow = () => {
  if (shadowEnabled.value) {
    viewer.context.scene.remove(sun)
  } else {
    viewer.context.scene.add(sun)

    sun.directionalLight.shadow.camera.left = -500;
    sun.directionalLight.shadow.camera.right = 500;
    sun.directionalLight.shadow.camera.top = 500;
    sun.directionalLight.shadow.camera.bottom = -500;
    sun.directionalLight.shadow.camera.near = -500;

    sun.directionalLight.shadow.mapSize.width = 1024 * 1; // Double the default width
    sun.directionalLight.shadow.mapSize.height = 1024 * 1; // Double the default height

    sun.directionalLight.shadow.bias = -0.0010; // Experiment with this value

    sun.directionalLight.shadow.camera.updateProjectionMatrix();

    sun.updateOrientation(date);
    sun.updateDirectionalLight();
  }

  shadowEnabled.value = !shadowEnabled.value
}

// Example usage
const coordinates = latLngToCartesian(7.440787, 46.941367);
console.table(coordinates);  // Should approximately give {x: 53, y: 0, z: 52}


const goTo = (x: number, y: number) => {
  viewer.context.ifcCamera.cameraControls.setLookAt(x + 50, 50, y + 50, x, 5, y, true)
}

const format = (event: { value: number }) => {
  var minutes = +event.value;
  var hours = Math.floor(minutes / 60);
  minutes = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

const onPOISelected = (coordinates: { lat: number, long: number }) => {
  // todo move camera to position
  console.log("coordiantes:");
  console.table(coordinates);

  const converted = latLngToCartesian(coordinates.long, coordinates.lat)

  goTo(converted.x, converted.y)

  drawMarker(viewer.context.scene.scene, converted.x, converted.y)
}

const setTime = (event: { value: number }) => {
  let minutes = +event.value;
  const hours = Math.floor(minutes / 60);
  minutes = minutes % 60;

  date.setMinutes(minutes)
  date.setHours(hours)

	sun.updateOrientation(date);
	sun.updateDirectionalLight();
}

const setDate = (event: any) => {
  const newDate = new Date(event.target.value);
  let minutes = date.getMinutes();
  let hours = date.getHours();

  date.setFullYear(newDate.getFullYear(), newDate.getMonth(), newDate.getDate());
  date.setMinutes(minutes);
  date.setHours(hours);

  console.log(date);

	sun.updateOrientation(date);
	sun.updateDirectionalLight();
}

const getUvMessage = function() {
  let message = "";
  if (uv.value <= 40) {
    message = "It is currently dark outside";
  } else if (40 < uv.value && uv.value <= 120) {
    message = "You can leave your sunglasses at home";
  } else if (120 < uv.value && uv.value <= 250) {
    message = "Quite sunny innit";
  } else if (250 < uv.value && uv.value <= 500) {
    message = "Bring sunscreen with you";
  } else if (uv.value > 500) {
    message = "You'll be roasted outside";
  }

  return message + " (" + uv.value + " W/m²)";
}
</script>

<template>

  <div class="wrapper">
    <div ref="container" class="container"></div>

    <div v-if="loading" class="loader">
      <div>
        {{ Math.round(progress * 100) }}% Loading...
      </div>
    </div>

    <div class="slider">
      <round-slider
        min="360"
        max="1260"
        :model-value="date.getHours() * 60 + date.getMinutes()"
        end-angle="180"
        line-cap="round"
        radius="100"
        rangeColor="#FFD523"
        handleShape="dot"
        :tooltipFormat="format"
        :change="setTime"
      />

      <input class="inputdate" type="date"
        @change="setDate"/>
    </div>

    <nav>
      <POIAutocomplete @selectPoi="onPOISelected" />
      <div class="controls">
        <label class="navlabel">Toggle shadow</label>
        <button :class="{  'toggleswitch toggleswitch--active' : shadowEnabled, 'toggleswitch' : !shadowEnabled }" @click="toggleShadow"></button>
      </div>

      <div class="rad">{{getUvMessage()}}</div>
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
  padding: 2rem;

  position: absolute;
  top: 0;
  left: 0;
  max-width: 500px;
  background: rgb(44, 46, 67);
  box-shadow: rgba(89, 82, 96, 0.4) 0px 7px 29px 0px;
  width: 100%;
  box-sizing: border-box;
}

.slider {
  width: 100%;
  position: absolute;
  bottom: 0;

  display: flex;
  flex-direction: column;
  align-items: center;
  padding-bottom: 2em;
}
.slider .rs-control {
  margin-bottom: -50px;
} 

.container {
  height: 100%;
  width: 100%;
  position: absolute;
  overflow: hidden;
}

.nav-btn {
  cursor: pointer;
  background: #d9d7e6;
  border: 1px solid #d9d7e6;
  border-radius: 2px;
  padding: 10px;
  font-size: medium;
  transition: background-color 0.15s ease-in-out, border-color 0.15s ease-in-out;
  box-shadow: 0 0 10px 0 rgba(0,0,0,0.75);
}

.nav-btn--primary {
  border-color: #FFD523; 
  background-color: #FFD523; 
}

.rad {
  color: white;
  margin-top: 15px;
}

.loader {
  height: 100%;
  width: 100%;
  position: absolute;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(100, 100, 111, 0.5);
  color: rgb(196, 238, 255);
  font-size: 22px;
  text-transform: uppercase;
  font-weight: bolder;
  text-align: center;
}

.toggleswitch {
  border: none;
  box-shadow: none;
  outline: none;

  position: relative;
  width: 3.5em;
  height: 2em;
  cursor: pointer;
  border-radius: 2em;
  transition: background-color 0.25s ease-in-out;
}

.toggleswitch::before {
  content: "";
  position: absolute;
  top: 3px;
  left: 3px;
  width: calc(2em - 6px);
  height: calc(2em - 6px);
  border-radius: 50%;
  background-color: rgb(44, 46, 67);
  transition: left 0.35s ease-in-out, background-color 0.25s ease-in-out;
}

.toggleswitch--active {
  background-color: #e7be0b;
}
.toggleswitch--active::before {
  background-color: white;
  left: calc(100% - (2em - 6px) - 3px);
}

.navlabel {
  margin: 15px 0 5px;
  color: white;
  display: block;
}

.inputdate {
  padding: 0.5em 1em;
  font-family: inherit;
  background-color: white;
  border: 2px solid rgb(44, 46, 67);
  width: 200px;
  max-width: 100%;
}

</style>