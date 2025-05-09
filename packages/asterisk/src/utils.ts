// deno-lint-ignore-file no-explicit-any
import axios from "npm:axios"

const baseURL = "http://localhost:8088"
const username = "loony"
const password = "password"
const appName = "loony"

const Authorization = "Basic " + btoa(`${username}:${password}`)

const client = axios.create({
  baseURL: `${baseURL.replace(/\/$/, "")}/ari`,
  headers: {
    Authorization,
    "Content-Type": "application/json",
  },
})

const createBridge = (name: string): Promise<boolean | any> => {
  const url = "/bridges"
  return new Promise((resolve, reject) => {
    client.post(url, {
      type: "mixing",
      name,
    }).then((res) => {
      resolve(res.data)
    }).catch(() => {
      reject(false)
    })
  })
}

const wait = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const addChannelToBridge = (
  bridgeId: string,
  channelId: string,
): Promise<boolean> => {
  const url = `/bridges/${bridgeId}/addChannel?channel=${channelId}`
  return new Promise((resolve, reject) => {
    client.post(url).then(
      () => {
        console.log(`Channel ${channelId} added to bridge ${bridgeId}.`)
        resolve(true)
      },
    ).catch(() => {
      reject(false)
    })
  })
}

const answerCall = (channelId: string) => {
  const url = `/channels/${channelId}/answer`
  return new Promise((resolve, reject) => {
    client.post(url).then(
      () => {
        console.log("Call answered.", channelId)
        resolve(true)
      },
    ).catch(() => {
      reject(false)
    })
  })
}

const playAudio = (channelId: string, audio: string) => {
  const url = `/channels/${channelId}/play?media=sound:${audio}`
  return new Promise((resolve, reject) => {
    client.post(url).then(
      () => {
        resolve(true)
      },
    ).catch(() => {
      reject(false)
    })
  })
}

const createExternalMediaChannel = (): Promise<any | boolean> => {
  const host = "127.0.0.1"
  const port = 8081
  const external_host = encodeURIComponent(`${host}:${port}`)
  const url =
    `/channels/externalMedia?app=${appName}&external_host=${external_host}&format=slin16`
  return new Promise((resolve, reject) => {
    client.post(url).then(
      (res) => {
        resolve(res.data)
      },
    ).catch(() => {
      reject(false)
    })
  })
}

const getChannels = () => {
  const url = `/channels`
  return new Promise((resolve, reject) => {
    client.get(url).then(
      (res) => {
        resolve(res.data)
      },
    ).catch(() => {
      reject(false)
    })
  })
}

const getBridges = () => {
  const url = `/bridges`
  return new Promise((resolve, reject) => {
    client.get(url).then(
      (res) => {
        resolve(res.data)
      },
    ).catch(() => {
      reject(false)
    })
  })
}

const getBridgeById = (bridgeId: string) => {
  const url = `/bridges/${bridgeId}`
  return new Promise((resolve, reject) => {
    client.get(url).then(
      (res) => {
        resolve(res.data)
      },
    ).catch(() => {
      reject(false)
    })
  })
}

export {
  addChannelToBridge,
  answerCall,
  createBridge,
  createExternalMediaChannel,
  getBridgeById,
  getBridges,
  getChannels,
  playAudio,
  wait,
}
