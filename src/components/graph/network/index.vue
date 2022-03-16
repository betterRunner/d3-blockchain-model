<style scoped>
.text {
  pointer-events: none;
  user-select: none;
  -webkit-user-seletct: none;
  -moz-user-seletct: none;
  -ms-user-seletct: none;
}

div.tooltip {
  position: absolute;
  text-align: center;
  /* width: 60px;					
      height: 28px;					 */
  padding: 2px;
  font: 12px sans-serif;
  background: lightsteelblue;
  border: 0px;
  border-radius: 8px;
  pointer-events: none;
}

.svg {
  width: 100%;
  height: 100%;
  /* border: solid black 1px; */
}

.container {
  display: flex;
  align-items: center;
}

</style>

<template>
  <svg
    id="svg"
    class="svg"
    ref="svg"
  >
    <g></g>
  </svg>
</template>

<script>
import * as d3 from 'd3'
import 'd3-selection-multi'
import D3CONS from './cons'

export default {
  name: 'AssociationGraph',
  props: {
    data: {
      default() {
        return {
          nodeDatas: [],
          linkDatas: []
        }
      },
      type: Object
    },
    updateStateOptions: {
      type: Object,
      default() {
        return {
          blockType: '',
          blockId: '',
          filter: [] // 不需要展示的内容
        }
      }
    }
  },
  data () {
    return {
      // data
      innerNodeDatas: [], // d3 node element的data
      innerLinkDatas: [], // d3 link element的data
      // d3 element
      dNodes: null, // graph的节点
      dLinks: null, // graph的连线
      // generator
      colorGnDict: {
        'org': {
          gn: null,
          len: 0,
          ids: []
        }
      },
      // d3 others
      svg: null, // svg element
      svgWidth: 0,
      svgHeight: 0,
      simulationMap: {}, // force 的simulation
      // others
      scrollTop: 0, // body的scrollTop
      lockItemIds: [], // 点击固定的item关联的id
      lastBlcokId: '',
    }
  },
  computed: {
  },
  watch: {
    d3Data: {
      handler(val) {
        if (val) {
          const { nodeDatas, linkDatas } = val
          this._packData(nodeDatas, linkDatas)

          // 刷新simulation
          this.updateSimulation()
          // 刷新graph
          this.updateGraph()
        }
      }
    },
    updateStateOptions(val) {
      if (val) {
        this.updateState(val)
        this.$emit('update:updateStateOptions', null)
      }
    }
  },
  created () {
  },
  mounted () {
    setTimeout(() => {
      this.initGraph()
      const { nodeDatas, linkDatas } = this.data;
      this._packData(nodeDatas, linkDatas)

      // 刷新simulation
      this.updateSimulation()
      // 刷新graph
      this.updateGraph()
    })
  },
  beforeDestroy() {
  },
  methods: {
    _packData(nodeDatas, linkDatas) {
      const orgNodes = nodeDatas.filter(ele => ele.dType === 'org')
      const orgNums = this._getArrayTypesNum(orgNodes, 'id')

      // 1. innerNodeDatas
      this.innerNodeDatas = nodeDatas.map(node => {
        return Object.assign({}, node, D3CONS.node[node.dType], {
          className: `node-${node.dType}`
        })
      })
      this.innerNodeDatas.filter(ele => ele.dType === 'org')
        .forEach(node => {
          node.radius = 30 + node.params.baseRadius * node['node_list'].length
        })

      // 2. innerLinkDatas
      this.innerLinkDatas = linkDatas.map(link => {
          return Object.assign({}, link, D3CONS.link[link.dType], {
            id: link.source + '-' + link.target,
            className: `link-${link.dType}`
          })
        })
      this.innerLinkDatas.filter(link => link.dType === 'org-org')
        .forEach(link => {
          // 用svg的宽度除以总共有多少个org作为org-org的距离
          link.distance = this.svgWidth / orgNums
        })
      
      // 3. other d3 object
      this.colorGnDict['org'].gn = this._getColorGn(orgNums)
      this.colorGnDict['org'].len = orgNums
    },
    _getArrayTypesNum(arr, key) {
      const dict = {}
      arr.forEach(ele => {
        const val = ele[key]
        dict[val] = dict[val] || val
      })
      return Object.keys(dict).length
    },
    _getColorGn(size) {
      return d3.scaleOrdinal(d3.quantize(d3.interpolateRainbow, size + 1))
    },
    _getRandomColorById(type, id) {
      const item = this.colorGnDict[type]
      const { gn, ids, len } = item
      const index = ids.findIndex(ele => ele === id)
      if (index !== -1) {
        return gn(index * 3)
      } else {
        ids.push(id)
        return gn((ids.length - 1) * 3)
      }
    },
    _drag(simulationMap) {
      const _isHasEmpty = () => {
        for (const key in simulationMap) {
          if (!simulationMap[key]) {
            return true
          }
        }
        return false
      }
      const isHasEmpty = _isHasEmpty()

      const _dragstarted = (d) => {
        if (!isHasEmpty) {
          console.log(d3);
          if (!d3.event.active) {
            for (const key in simulationMap) {
              simulationMap[key].alphaTarget(0.3).restart()
            }
          }
          d.fx = d.x
          d.fy = d.y
        }
      }

      const _dragged = (d) => {
        d.fx = d3.event.x
        d.fy = d3.event.y
      }

      const _dragended = (d) => {
        if (!isHasEmpty) {
          if (!d3.event.active) {
            for (const key in simulationMap) {
              simulationMap[key].alphaTarget(0)
            }
          }
          d.fx = null
          d.fy = null
        }
      }

      return d3.drag()
        .on('start', _dragstarted)
        .on('drag', _dragged)
        .on('end', _dragended);
    },
    _updateOrgText() {
      const { dNodes, innerNodeDatas, } = this
      const orgNodes = dNodes.filter('.node-org')
      orgNodes
        .append('text')
        .attr('stroke', '#999')
        .attr('font-size', '10px')
        .attr('font-weight', 'normal')
        .text(function (d) {
          return d['name']
        })
    },
    _getBB(selection) {
        selection.each(function(d){d.bbox = this.getBBox();})
    },
    _updateNodeNode(nodes) {
      const { _getRandomColorById } = this

      const g = nodes
        .append('g')
        .attr('stroke', 'none')
        .attr('stroke-width', '1')
        .attr('fill-rule', 'evenodd')
        .attr('style', `opacity: 1.0; transform: translate(-20px, -20px)`)
      const g2 = g.append('g')
        .attr('class', 'polygon')
        .attr('transition', '0.5s ease')
      g2.append('polygon')
        .attr('class', `node-edge1`)
        .attr('stroke', '#333333')
        .attr('stroke-width', 0.51)
        .attr('fill', '#FFFFFF')
        .attr('transform', 'translate(14.950750, 17.000000) scale(-1, 1) translate(-14.950750, -17.000000)')
        .attr('points', '14.9507497 0 29.7484882 8.5 29.7484882 25.5 14.9507497 34 0.15301131 25.5 0.15301131 8.5')
      g2.append('polygon')
        .attr('fill', d => { return _getRandomColorById('org', d['org_id'])}) // 50BFDF
        .attr('points', '15 5.45299462 25 11.2264973 25 22.7735027 15 28.5470054 5 22.7735027 5 11.2264973')
      const g3 = g2.append('g')
        .attr('class', `node-edge2`)
        .attr('transform', 'translate(0.000000, 9.000000)')
        .attr('stroke', '#333333')
        .attr('stroke-width', 0.51)
      g3.append('path')
        .attr('d', 'M0,0 L15.2781894,7.35747702')
      g3.append('path')
        .attr('d', 'M15,0 L29.8789229,7.37862471')
        .attr('transform', 'translate(22.439461, 3.689312) scale(-1, 1) translate(-22.439461, -3.689312) ')
      g3.append('path')
        .attr('d', 'M15.2608696,7 L15.2608696,25.0944376')
      
      g2.append('text')
        .attr('stroke', '#333')
        .attr('font-size', '10px')
        .attr('font-weight', 'light')
        .attr('y', d => `50px`)
        .text(function (d) {
          return d['name']
        })
        .style('user-select', 'none')
    },
    _updateNodeOrg(nodes) {
      const { _getRandomColorById } = this
      const g = nodes
        .append('g')
        
      g.append('circle')
        .attr('r', (d) => d.radius)
        .attr('fill', d => _getRandomColorById('org', d['id']))
        .attr('opacity', 0.5)

      g.append('circle')
        .attr('r', 5)
        .attr('class', 'dot')
        .attr('fill', d => _getRandomColorById('org', d['id']))

      g.append('text')
        .attr('stroke', '#333')
        .attr('font-size', '10px')
        .attr('font-weight', 'light')
        .text(function (d) {
          return d['name']
        })
        .style('user-select', 'none')
        .call(this._getBB)
        .attr('x', d => -(d.bbox.width / 2))
        .attr('y', d => `${d.radius + 10}px`)
    },
    _updateNodeCc(nodes) {
      const { _getRandomColorById } = this

      const g = nodes
        .append('g')
        .attr('class', 'cc')
        .attr('opacity', '0.8')
      
      g.append('text')
        .attr('stroke', '#333')
        .style('font-size', '15px')
        .style('font-weight', 'lighter')
        .text(function (d) {
          return d['name']
        })
        .style('user-select', 'none')
        .call(this._getBB)
        .attr('x', d => -(d.bbox.width) / 2)

      g.insert('g', 'text')
        .attr('transform', d => `translate(${(-Number(d.bbox.width+5) / 2)}, ${-(d.bbox.height+15) / 2})`)
        .append('g')
          .attr('transform', function(d) {
            return `scale(${d.bbox.width / 30}, ${d.bbox.height / 13}) translate(-1031, -421)`
          })
          .attr('fill', d => _getRandomColorById('org', d['org_id']))
          .append('path')
          .attr('d', 'M1066.59977,425.777481 C1066.82554,426.05652 1067,426.631509 1067,426.631509 L1067,438.816199 C1067,439.46729 1066.35348,440 1065.55302,440 L1032.44698,440 C1031.64652,440 1031,439.46729 1031,438.816199 L1031,422.183801 C1031,421.524255 1031.64652,421 1032.44698,421 L1061.22235,421 C1061.22235,421 1061.62258,421.076101 1061.92018,421.211393 C1062.24857,421.372052 1062.61802,421.668002 1062.61802,421.668002 L1066.11745,425.202492 C1066.11745,425.202492 1066.38426,425.506898 1066.59977,425.777481')
    },
    _simulationTickFunc(filterNodes = '', filterLinks = '') {
      return () => {
        let dLinks = this.dLinks
        if (dLinks) {
          // 更新link的坐标
          dLinks.attr('x1', link => link.source.x || 0)
            .attr('y1', link => link.source.y || 0)
            .attr('x2', link => link.target.x || 0)
            .attr('y2', link => link.target.y || 0)
        } 

        let dNodes = this.dNodes
        if (dNodes) {
          // 更新node的icon坐标
          dNodes
            .attr('transform', d => `translate(${d.x}, ${d.y})`)
          dNodes.filter('.node-network')
            .select('g')
            .attr('transform', d => `translate(0, 0)`)
            .attr('dx', 0)
            .attr('dy', 0)
            .attr('x', 0)
            .attr('y', 0)
        }
      }
    },
    _getForceLink(links) {
      links = d3.forceLink(links).id(d => d.id)
      return links.distance(d => d.distance).strength(d => d.strength)
    },
    _getNodeLinkSimulation() {
      const forceRadial = d3.forceRadial((this.svgWidth / 4)) // force在一个半径圆内
      forceRadial.strength(0.5) // strength默认0.1
  
      const channelLinks = this.innerLinkDatas.filter(ele => ele.dType === 'channel')
      const otherLinks = this.innerLinkDatas.filter(ele => ele.dType === 'cc-cc' || ele.dType === 'org-org' || ele.dType === 'org-node')
      const simulation = d3.forceSimulation(this.innerNodeDatas)
        .force('charge', d3.forceManyBody())
        .force('link', this._getForceLink(channelLinks))
        .force('link', this._getForceLink(otherLinks))
        .force('center', forceRadial)

      const simulationTick = this._simulationTickFunc()
      simulation.on('tick', simulationTick)

      return simulation
    },
    _getNodeLinkSimulation2() {
      // 获取org半径
      let orgRadius = 0
      const orgNodeDatas = this.innerNodeDatas.filter(ele => ele.dType === 'org')
      const orgNode = orgNodeDatas.length && orgNodeDatas[0]
      if (orgNode) {
        orgRadius = orgNode['node_list'].length * 30 + 30
      }
      const forceCollision = d3.forceCollide(orgRadius) // 每个node包裹在半径圆内，别的node碰撞到圆边界会反弹
        .strength(1.0)
      const simulation = d3.forceSimulation(orgNodeDatas)
        .force('center', forceCollision)
      const simulationTick = this._simulationTickFunc('node-org')
      simulation.on('tick', simulationTick)
      return simulation
    },
    _getNodeLinkSimulation3() {
      const nodeNodeDatas = this.innerNodeDatas.filter(ele => ele.dType === 'node')
      const forceCollision = d3.forceCollide(30) // 每个node包裹在半径圆内，别的node碰撞到圆边界会反弹
        .strength(0.5)
      const simulation = d3.forceSimulation(nodeNodeDatas)
        .force('center', forceCollision)
      const simulationTick = this._simulationTickFunc('node-org')
      simulation.on('tick', simulationTick)
      return simulation
    },
    _getNodeLinkSimulation4() {
      const ccNodeDatas = this.innerNodeDatas.filter(ele => ele.dType === 'cc')
      const forceCollision = d3.forceCollide(30) // 每个node包裹在半径圆内，别的node碰撞到圆边界会反弹
        .strength(0.5)
      const simulation = d3.forceSimulation(ccNodeDatas)
        .force('center', forceCollision)
      const simulationTick = this._simulationTickFunc('node-cc')
      simulation.on('tick', simulationTick)
      return simulation
    },
    _getNodeLinkSimulation5() {
      const links = this.innerLinkDatas.filter(ele => ele.dType === 'node-cc')
      const simulation = d3.forceSimulation(this.innerNodeDatas)
        .force('charge', d3.forceManyBody())
        .force('link', this._getForceLink(links))

      const simulationTick = this._simulationTickFunc()
      simulation.on('tick', simulationTick)

      return simulation
    },
    updateSimulation() {
      // 停止原先simulation运行的timer
      for (const key in this.simulationMap) {
        key && this.simulationMap[key].stop()
      }
      this.simulationMap['node-link'] = this._getNodeLinkSimulation()
      this.simulationMap['node-link2'] = this._getNodeLinkSimulation2()
      this.simulationMap['node-link3'] = this._getNodeLinkSimulation3()
      this.simulationMap['node-link4'] = this._getNodeLinkSimulation4()
      this.simulationMap['node-link5'] = this._getNodeLinkSimulation5()
    },
    _getChannelNodesAndLinks(node) {
      let nodes = []
      let links = []
      const { 'channel_list': channels } = node
      if (channels) {
        channels.forEach(channelId => {
          const relatedLinks = this.innerLinkDatas.filter(ele => ele['channel_id'] === channelId)
          links = [...links, ...relatedLinks]
          const _findNode = (id) => this.innerNodeDatas.find(ele => ele.id === id)
          const relatedNodes = relatedLinks.reduce((sum, ele) => [...sum, _findNode(ele.source.id), _findNode(ele.target.id)], [])
          nodes = [...nodes, ...Array.from(new Set(relatedNodes))]
        })
      }
      return { nodes, links }
    },
    _getNodeRelatedNodesAndLinks (id, type = '') {
      const { innerLinkDatas, innerNodeDatas } = this
      let relatedLinks = innerLinkDatas.filter(ele => (ele.target === id) || (ele.source === id))
      let relatedNodeIds = relatedLinks.reduce((sum, ele) => {
        return [...sum, ele.target, ele.source]
      }, [])
      relatedNodeIds = Array.from(new Set(relatedNodeIds))
      const relatedNodes = innerNodeDatas.filter(ele => relatedNodeIds.includes(ele.id))
      return [relatedLinks, relatedNodes]
    },
    _getLinkRelatedNodes (id) {
      const { innerLinkDatas, innerNodeDatas } = this
      const link = innerLinkDatas.find(link => link.id === id)
      if (link) {
        const { source, target } = link
        const sourceNode = innerNodeDatas.find(node => node.id === source)
        const targetNode = innerNodeDatas.find(node => node.id === target)
        return [sourceNode, targetNode]
      }
      return []
    },
    _drawLink (id, { strokeWidth, strokeColor }) {
      try {
        d3.select('svg').select('#' + id)
          // .attr('stroke', strokeColor)
          .attr('stroke-width', strokeWidth)
      } catch (err) {
        console.log(err)
      }
    },
    _drawNode (id, { radius, strokeWidth, strokeColor }) {
      try {
        d3.select('svg').select('#' + id)
          .select('circle')
          .attr('r', radius)
          .attr('stroke', strokeColor)
          .attr('stroke-width', strokeWidth)
      } catch (err) {
        console.log(err)
      }
    },
    _showOrHideTooltipOfNode (id, node, showOrHide) {
      try {
        const tooltipId = `t-` + id
        const opacity = 1.0
        if (showOrHide) {
          // 添加tooltip如果没有
          if (d3.select('body').select('#' + tooltipId).empty() === true) {
            const sNode = this.svg.select('#' + id)
            if (sNode) {
              const { scrollTop } = this
              const boundingRect = sNode.node().getBoundingClientRect()
              const { x, y } = boundingRect
              d3.select('body')
                .append('div')
                .attr('id', tooltipId)
                .attr('class', 'tooltip')
                .style('left', (x) + 'px')
                .style('top', (y + scrollTop - 20) + 'px')
                .html(node.name)
                .style('opacity', 0.0)
                .transition()
                .duration(500)
                .style('opacity', opacity)
            }
          }
        } else {
          // 取消tooltip如果有
          d3.select('body')
            .select('#' + tooltipId)
            .style('opacity', opacity)
            .transition()
            .duration(500)
            .style('opacity', 0.0)
            .remove()
        }
      } catch (err) {
        console.log(err)
      }
    },
    _changeLink (link, inOrOut) {
      const { id, strokeWidth, hlStrokeWidth, strokeColor } = link
      this._drawLink(id, { strokeWidth: inOrOut ? hlStrokeWidth : strokeWidth, strokeColor: strokeColor })
    },
    _changeNode (node, inOrOut, type = '') {
      switch(type) {
        case 'channel':
          const { nodes, links } = this._getChannelNodesAndLinks(node)
          break
        default:
          break
      }
    },
    _onClick (item, type) {
      const { id } = item

      if (this.lockItemIds.includes(id)) { // 再次点击lockItems，清空
        this.lockItemIds = []
      } else if(this.lockItemIds.length === 0) { // 第一次点击，记录新的id list
        const items = type === 'node' ? [].concat(...this._getNodeRelatedNodesAndLinks(id)) :
          [item, ...this._getLinkRelatedNodes(id)]
        this.lockItemIds = items.map(item => item.id)
      }
    },
    _onMouseEnter (item, type) {
      type === 'node' ? this._changeNode(item, true, 'channel') : this._changeLink(item, true)
    },
    _onMouseOut (item, type) {
      // if (this.lockItemIds.length === 0) { // 取消lock才允许触发
        type === 'node' ? this._changeNode(item, false) : this._changeLink(item, false, 'channel')
      // }
    },
    initGraph () {
      const domSvg = this.$refs['svg']
      const svgWidth = this.svgWidth = domSvg.clientWidth
      const svgHeight = this.svgHeight = domSvg.clientHeight
      const radius = svgWidth > svgHeight ? svgHeight / 2 : svgWidth / 2

      // 创建svg
      this.svg = d3.select('#svg')
        .select('g')
        .attr('transform', `translate(${radius}, ${radius})`)
      // network圆
      this.svg.selectAll('#network').remove()
      this.svg
        .append('g')
        .attr('id', 'network')
        .append('circle')
        .attr('fill', '#f1f1f1')
        .attr('opacity', 0.4)
        .attr('r', (d) => radius)
      // links
      this.svg.append('g')
        .attr('id', 'links')
      // nodes
      this.svg.append('g')
        .attr('id', 'nodes')
      // 获取body的scrollTop,后续配合d3 element的`getBoundingClientRect`实现tooltip
      this.scrollTop = document.body.scrollTop + document.documentElement.scrollTop
    },
    updateGraph () {
      const { innerLinkDatas, innerNodeDatas, simulationMap, colorGnDict } = this
      // 1. links
      this.svg.select('#links').selectAll('line').remove() // 每次更新先remove数据
      this.dLinks = this.svg.select(`#links`)
        .selectAll('line')
        .data(innerLinkDatas).join('line')
        .attr('id', d => d.id)
        .attr('class', d => d.className)
        .attr('stroke', d => d.strokeColor)
        .attr('stoke-opacity', d => d.strokeOpacity)
        .attr('stroke-width', d =>  d.strokeWidth)
        .on('mouseenter', (link) => this._onMouseEnter(link, 'link'))
        .on('mouseleave', (link) => this._onMouseOut(link, 'link'))
        .on('click', (link) => this._onClick(link, 'link'))
        .sort((a, b) => a.strokeWidth - b.strokeWidth) // 粗的线放在后面（优先显示）
      // 1.1 channel
      this.dLinks.filter('.link-channel')
        .attr('stroke', '#333')

      // 2. nodes
      this.svg.select(`#nodes`).selectAll('g').remove() // 每次更新先remove数据
      this.dNodes = this.svg.select(`#nodes`)
          .selectAll('g')
          .data(innerNodeDatas).join('g')
          .attr('id', (d) => d.id)
          .attr('class', (d) => d.className)
          .on('mouseenter', (node) => this._onMouseEnter(node, 'node'))
          .on('mouseleave', (node) => this._onMouseOut(node, 'node'))
      // 拉拽动效
      this.dNodes.call(this._drag(this.simulationMap))
      const g = this.dNodes.filter('.node-network').append('g')
      g.append('circle')
        .attr('r', 10)
      // 2.1 org类型节点
      this._updateNodeOrg(this.dNodes.filter('.node-org'))
      // 2.2 node类型节点
      this._updateNodeNode(this.dNodes.filter('.node-node'))
      // 2.3 cc类型节点
      this._updateNodeCc(this.dNodes.filter('.node-cc'))
    },

    updateState({ blockType = '', blockId = '', filter = [] }) {
      const { eNodeStatus, node } = D3CONS

      const _updateNodeSubStatus = (ele, isMatch) => {
        if (ele.status & eNodeStatus.subSelect) { // 上一次是选中类型，需要清除状态
          ele.status = isMatch ? ele.status & ((eNodeStatus.subSelect << 1) - 1): ele.status & ((eNodeStatus.subSelect) - 1)
        } else {
          ele.status |= isMatch ? eNodeStatus.subSelect : eNodeStatus.normal
        }
      }

      switch(blockType) {
        case 'sub-channels':
        case 'channels': {
          this.innerNodeDatas.forEach(ele => {
            const isMatch = !filter.includes(ele.dType) && ((ele['channel_list'] && ele['channel_list'].includes(blockId)) || ele['channel_id'] === blockId)
            if (blockType === 'channels') {
              ele.status = isMatch ? eNodeStatus.select: eNodeStatus.normal
            } else {
              _updateNodeSubStatus(ele, isMatch)
            }
          })
          this.innerLinkDatas.forEach(ele => {
            ele.isLinked = (ele.dType === 'channel' && ele['channel_id'] === blockId)
          })
          break
        }
        case 'sub-orgs':
        case 'orgs': {
          this.innerNodeDatas.forEach(ele => {
            const isMatch = !filter.includes(ele.dType) && ((ele['org_list'] && ele['org_list'].includes(blockId)) || ele['org_id'] === blockId || ele['id'] === blockId)
            if (blockType === 'orgs') {
              ele.status = isMatch ? eNodeStatus.select : eNodeStatus.normal
            } else {
              _updateNodeSubStatus(ele, isMatch)
            }
          })
          if (blockType === 'orgs') {
            this.innerLinkDatas.forEach(ele => {
              ele.isLinked = false
            })
          }
          break
        }
        case 'sub-nodes':
        case 'nodes': {
          this.innerNodeDatas.forEach(ele => {
            const isMatch = ele['id'] === blockId || (!filter.includes(ele.dType) && !filter.includes('peer_list') && ele['peer_list'] && ele['peer_list'].includes(blockId))
            if (blockType === 'nodes') {
              ele.status = isMatch ? eNodeStatus.select: eNodeStatus.normal
            } else {
              _updateNodeSubStatus(ele, isMatch)
            }
          })
          if (blockType === 'nodes') {
            this.innerLinkDatas.forEach(ele => {
              ele.isLinked = ele.dType === 'node-cc' && ele.source.id === blockId
            })
          }
          break
        }
        case 'sub-ccs':
        case 'ccs': {
          const _isSubMatch = (ele, blockId, key) => {
            let isMatch
            const [ccId, peerId] = blockId.split('___')
            if (peerId) {
              isMatch = ele[key] === blockId
            } else {
              isMatch = blockId && ele[key].includes(blockId)
            }
            return isMatch
          }

          let nodes = []
          let links = []
          if (blockType === 'ccs') {
            const ccs = this.innerNodeDatas.filter(ele => ele.id.includes(blockId))
            ccs.forEach(cc => {
              const channelId = cc['channel_id']
              links = this.innerLinkDatas.filter(ele => (ele.dType === 'channel' && ele['channel_id'] === channelId) || (ele.dType === 'node-cc' && ele.target && ele.target['id'] === cc.id))
              nodes.splice(nodes.length, 0, ...this.innerNodeDatas.filter(ele => (ele['channel_list'] && ele['channel_list'].includes(channelId)) || (ele['id'] === cc.id)))
            })
          }
          this.innerNodeDatas.forEach(ele => {
            if (blockType === 'ccs') {
              const isMatch = nodes.includes(ele)
              ele.status = isMatch ? eNodeStatus.select: eNodeStatus.normal
            } else {
              let isMatch = _isSubMatch(ele, blockId, 'id')
              _updateNodeSubStatus(ele, isMatch)
            }
          })
          if (blockType === 'ccs') {
            this.innerLinkDatas.forEach(ele => {
              ele.isLinked = links.includes(ele)
            })
          } else {
            this.innerLinkDatas.forEach(ele => {
              ele.isLinked = _isSubMatch(ele.source, blockId, 'id')
            })
          }
          break
        }
        default: {

          break
        }
      }
      
      this.dNodes && this.dNodes
        .each(function (d) {
          const _this = this
          const _updateAttrs = (operDict) => {
            Object.keys(operDict).forEach(key => {
              let selection = d3.select(_this)
              selection = key === 'root' ? selection : selection.select(key)
              selection.attrs(operDict[key])
            })
          }

          const { dType, status } = d
          const { statusOper } = node[dType]
          if (statusOper) {
            for (const key in eNodeStatus) {
              const statusKey = eNodeStatus[key]
              if (status & statusKey) {
                const operDict = statusOper[statusKey]
                _updateAttrs(operDict)
              }
            }
          }
        })

      this.dLinks && this.dLinks
        .style('visibility', d => d.isLinked ? 'visible' : 'hidden')

      this.lastBlcokId = blockId
    }
  }
}
</script>
