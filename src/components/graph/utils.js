export function preProcessData(data) {
  const { ccs, nodes } = data
  // cc包含在多个node中，目前需要区分它们（以`nodeId-ccId`区分）
  let newCcs = []
  ccs.forEach(cc => {
    const { peer_list: peerList } = cc
    peerList.forEach(peerId => {
      const peer = nodes.find(data => data.id === peerId)
      const ccId = `${cc.id}___${peerId}`
      newCcs.push(Object.assign({}, cc, {
        id: ccId,
        peer_list: [peerId],
        org_id: peer && peer['org_id']
      }))
      if (peer) {
        const { cc_list: ccList = [] } = peer
        const ccIndex = ccList.findIndex(data => data === cc.id)
        if (ccIndex !== -1) {
          // console.log(peerId, ccIndex, ccId, ccList)
          ccList.splice(ccIndex, 1, ccId)
        }
      }
    })
  })
  data.oriCcs = ccs
  data.ccs = newCcs
  return data
}

export function parseData(data) {
  const _ringLink = (arr, dType, data = {}, isRing = true) => {
    const ret = []
    arr.forEach((_, index, array) => {
      const source = array[index]
      const target = (index === arr.length - 1) ? (isRing ? array[0] : null) : array[index + 1]
      if (source && target) {
        ret.push({ source, target, dType, ...data })
      }
    })
    return ret
  }

  const { channels, orgs, nodes: oriNodes, ccs } = data
  // 1. nodes
  let nodes = [
    ...orgs.map(ele => Object.assign({}, ele, { dType: 'org' })),
    ...oriNodes.map(ele => Object.assign({}, ele, { dType: 'node' })),
    ...ccs.map(ele => Object.assign({}, ele, { dType: 'cc' }))
  ]
  // 2. links
  const links = []
  // (1) channel
  channels.forEach(channel => {
    channel['channel_id'] = channel.id
    let peerIdList = channel['peer_list'] || []
    const orgIdList = channel['org_list'] || []
    // 如果peer和它所属的org在同一个channel，则peer和org连起来，org与其他peer连起来
    // (1) 找到其所属的org也在channel的peer的ids
    const peersInOrg = peerIdList.map(id => oriNodes.find(ele => ele.id === id)).filter(ele => orgIdList.includes(ele['org_id']))
    // (2) 从原数组删去(1)的peers，并且加上它们所属的orgs
    const peerNotInOrgIds = peerIdList.filter(id => !peersInOrg.map(ele => ele['id']).includes(id))
    const ids = peerNotInOrgIds.concat(peersInOrg.map(ele => ele['org_id']))
    peersInOrg.forEach(peer => {
      links.push(Object.assign({}, channel, {
        source: peer['id'],
        target: peer['org_id'],
        dType: 'channel',
      }))
    })
    links.splice(links.length, 0, ..._ringLink(ids, 'channel', channel))
  })
  // (2) org-node
  orgs.forEach(org => {
    const nodeList = org['node_list'] || []
    nodeList.forEach(node => {
      const source = org.id
      const target = node
      links.push({ source, target, dType: 'org-node', ratio: org['node_list'].length })
    })
  })
  // (3) node-cc
  const channelNodeDict = {}
  ccs.forEach(cc => {
    const channelId = cc['channel_id']
    const peerList = cc['peer_list'] || []
    const peer = peerList.length && peerList[0]
    if (peer) {
      channelNodeDict[channelId] = channelNodeDict[channelId] || {}
      channelNodeDict[channelId][peer] = channelNodeDict[channelId][peer] || []
      channelNodeDict[channelId][peer].push(cc)
    }
  })
  Object.keys(channelNodeDict).forEach(channelId => {
    const peerDict = channelNodeDict[channelId]
    Object.keys(peerDict).forEach(peerId => {
      const ccList = peerDict[peerId]
      ccList.forEach(cc => {
        const link = { source: peerId, target: cc.id, dType: 'node-cc' }
        links.push(link)
      })
    })
  })
  // (4) org-org
  links.splice(links.length,0,..._ringLink(orgs.map(ele => ele.id), 'org-org', null, true))
  return {
    'id': data['id'],
    'name': data['name'],
    'consensus_type': data['consensus_type'],
    'nodes': nodes,
    'links': links
  }
}
