<script setup lang="ts">
import { onMounted, ref } from "vue";
import { IfcViewerAPI } from "web-ifc-viewer";
import { Color } from "three";
import POIAutocomplete from "./component/POIAutocomplete.vue";

const container = ref<HTMLDivElement | null>(null);

let viewer: IfcViewerAPI

onMounted(() => {
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

  viewer.axes.setAxes();
  viewer.grid.setGrid();

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

    console.log({x, y, z})
  };
  window.onmousemove = () => viewer.IFC.selector.prePickIfcItem();
  viewer.clipper.active = true;


  // const sun = new DirectionalLight(0xffffff, 1); // white color, intensity 1
  // sun.position.set(100, 100, 100); // set the light's position
  // sun.castShadow = true; // enable shadow casting
  // viewer.context.scene.add(sun); // add the light to the scene


  // sun.shadow.mapSize.width = 512; // default is 512
  // sun.shadow.mapSize.height = 512; // default is 512
  // sun.shadow.camera.near = 0.5; // default is 0.5
  // sun.shadow.camera.far = 500; // default is 500


  // viewer.context.renderer.renderer.shadowMap.enabled = true;
  // viewer.context.renderer.renderer.shadowMap.type = PCFSoftShadowMap; // default THREE.PCFShadowMap
})

const changed = (changed: Event) => {
    if (!changed.target) {
      return
    }

    const input = changed.target as HTMLInputElement;

    if (!input.files || !input.files.length) {
      return
    }

    const file = input.files[0];

    const ifcURL = URL.createObjectURL(file);

    viewer.IFC.loadIfcUrl(ifcURL);
  }

const onPOISelected = (coordinates) => {
  // todo move camera to position
  console.log("coordiantes:");
  console.table(coordinates);
}

</script>

<template>
  <input @change="changed" type="file" />
  <POIAutocomplete @selectPoi="onPOISelected" />
  <div ref="container" style="width: 100%; height: 90vh;"></div>
</template>
