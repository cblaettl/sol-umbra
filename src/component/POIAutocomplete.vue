<script setup lang="ts">
import {reactive} from "vue";

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
  display: inline-block;
  width: calc(100% - 32px) !important;
  border-radius: 3px;
  margin: 10px 0;
  padding: 4px 15px 4px 15px;
  position: relative;
  background: transparent;
  border: 1px solid #ddd;
  -webkit-transition: all 200ms ease-in-out;
  -moz-transition: all 200ms ease-in-out;
  transition: all 200ms ease-in-out;
}

.simple-typeahead:hover, .simple-typeahead:active {
  border: 1px solid blueviolet;
}

.simple-typeahead input[type=text] {
  font-size: 16px;
  width: 100%;
  border: none;
  box-shadow: none;
  display: inline-block;
  padding: 0;
  background: transparent;
}

.simple-typeahead input[type=text]:hover, .simple-typeahead input[type=text]:focus, .simple-typeahead input[type=text]:focus-visible, .simple-typeahead input[type=text]:active {
  box-shadow: none;
  outline: none;
}

</style>