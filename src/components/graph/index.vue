<template>
  <div class="graph">
    <Graph :data="d3Data" v-model:updateStateOptions="updateStateOptions" />
  </div>
</template>

<script>
import { ref } from 'vue';
import { preProcessData, parseData } from './utils'
import Graph from './network/index.vue'
import net2Json from './net.json'
export default {
  components: {Graph},
  setup() {
    const d3Data = ref(null);
    let network = JSON.parse(JSON.stringify(net2Json)) // networkJson net2Json
    network = preProcessData(network)
    const networkD3Data = parseData(network)
    const { nodes, links } = networkD3Data
    d3Data.value = {
      nodeDatas: nodes,
      linkDatas: links
    };

    const updateStateOptions = ref(null);
    return {
      d3Data,
      updateStateOptions,
    };
  }
}
</script>

<style scoped>
.graph {
  margin: auto;
  display: flex;
  height: 600px;
  width: 600px;
  justify-items: center;
}
</style>
