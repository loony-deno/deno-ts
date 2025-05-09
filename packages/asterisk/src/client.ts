import {
  addChannelToBridge,
  answerCall,
  createBridge,
  createExternalMediaChannel,
  playAudio,
} from "./utils.ts"

import RtpUdpServerSocket from "./externalMedia.ts"

const username = "loony"
const password = "password"
const appName = "loony"

function main() {
  const externalMedia = new RtpUdpServerSocket({
    host: "127.0.0.1:8081",
    swap16: true,
    audioOutputPath: "/home/sankar/Music/output.raw",
  })

  const ws = new WebSocket(
    `ws://localhost:8088/ari/events?api_key=${username}:${password}&app=${appName}`,
  )
  ws.onopen = () => {
    console.log("WebSocket connected to Asterisk ARI")
  }
  ws.onmessage = async (event) => {
    const data = JSON.parse(event.data)
    switch (data.type) {
      case "StasisStart": {
        const { id, name } = data.channel
        if (name.startsWith("PJSIP")) {
          console.log("StasisStart", "PJSIP")
          await answerCall(id)
          await playAudio(id, "hello-world")
          externalMedia.emit("start")
          const bridge = await createBridge("loony")
          const e_channel = await createExternalMediaChannel()
          await addChannelToBridge(bridge.id, id)
          await addChannelToBridge(bridge.id, e_channel.id)
        }
        break
      }
      case "StasisEnd": {
        console.log("StasisEnd")
        console.log("\n\n")
        break
      }
      case "ChannelHangupRequest": {
        console.log("ChannelHangupRequest")
        externalMedia.emit("stop")
        break
      }
      case "ChannelDtmfReceived": {
        console.log("ChannelDtmfReceived")
        break
      }
      case "PlaybackStarted": {
        console.log("PlaybackStarted")
        break
      }
      case "PlaybackFinished": {
        console.log("PlaybackFinished")
        break
      }
      default:
        break
    }
  }
  ws.onerror = (err) => {
    console.error("WebSocket error:", err)
  }
  ws.onclose = () => {
    console.log("WebSocket closed")
  }
}

main()
