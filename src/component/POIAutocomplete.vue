<script setup lang="ts">
import {reactive} from "vue";
import { ref } from "vue";
const emit = defineEmits(['selectPoi']);

const pois = reactive({list: []});
const search = async (input) => {
  if (input.length < 1) {
    return []
  }
  try {
    const result = await fetch(`https://api.geoapify.com/v1/geocode/autocomplete?text=${input}&filter=circle:7.4474,46.948,5000&apiKey=24a24b77c08c4dbabd1057b7bb86e4bf`, {
      method: 'GET',
    }).then(response => response.json());
    return result.features;
  } catch (e) {
    console.error(e);
    return [];
  }
}

const itemProjectionFunction = (item) => {
  return item.properties.name || item.properties.address_line1;
}

const onInputChange = async (event) => {
  pois.list = await search(event.input);
}

const onSelect = (result) => {
  const latLng = {lat: result.properties.lat, long: result.properties.lon};
  emit('selectPoi', latLng);
}

</script>

<template>
  <vue3-simple-typeahead
      id="typeahead_id"
      :items="pois.list"
      :minInputLength="1"
      :itemProjection="itemProjectionFunction"
      @selectItem="onSelect"
      @onInput="onInputChange"
  />
</template>

<style>

.simple-typeahead {
  font-size: 16px;
  border-radius: 0;
  box-sizing: border-box;
  width: 100%;
  padding: 0;
  border-radius: 0;
  margin: 10px 0;
  padding: 0;
  position: relative;
  background: transparent;
  -webkit-transition: all 200ms ease-in-out;
  -moz-transition: all 200ms ease-in-out;
  transition: all 200ms ease-in-out;
  color: #2C2E43;
  background: white;
}

.simple-typeahead input[type=text] {
  color: inherit;
  background: inherit;
  border: 2px solid white;
  font-size: inherit;
  width: 100%;
  box-sizing: border-box;
  box-shadow: none;
  display: inline-block;
  padding: 0.5em 1em;
}

.simple-typeahead:hover input[type=text],
.simple-typeahead:active input[type=text],
.simple-typeahead:focus input[type=text] {
  border-color: #FFD523;
}

.simple-typeahead input[type=text]:hover,
.simple-typeahead input[type=text]:focus,
.simple-typeahead input[type=text]:focus-visible, .simple-typeahead input[type=text]:active {
  box-shadow: none;
  outline: none;
}


</style>