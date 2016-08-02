var debug = require('debug')
var debugPrefix = 'blob-stream:subscriptions'

module.exports = (legacy, log) => [
  // read-only data sources that emit actions
  // Signature of (send, done)

  function subscribeToLogChanges (send, done) {
    var d = debug(debugPrefix + ':subscribeToLogChanges')
    var effect = send
    // subscribe to all hyperlog changes
    // caused through syncing or by ourselves
    var changesStream = log.createReadStream({
      live: true
    })

    changesStream.on('end', () => done(new Error('hyperlog createReadStream ended')))
    changesStream.on('data', node => {
      d('received log entry', node.value.toString())
      effect('fetch_related_torrent', JSON.parse(node.value.toString()),
        err => err && done(err))
    })
  },

  function findWebRTCPeers (send, done) {
    var d = debug(debugPrefix + ':findWebRTCPeers')

    var webrtcSwarm = require('webrtc-swarm')
    var signalhub = require('signalhub')
    var hub = signalhub('blob-stream', ['https://signalhub.perguth.de:65300'])
    var swarmOpts = legacy || {}
    var swarm = webrtcSwarm(hub, swarmOpts)

    swarm.on('connect', (peer, id) => {
      d('✔ peer connected', id)
      send('sync with peer', {peer, id}, err => err && done(err))
    })
    swarm.on('disconnect', (peer, id) => {
      d('✕ peer disconnected', id)
    })
    swarm.on('close', () => done(new Error('swarm closed')))
  }
]
