// deno-lint-ignore-file no-explicit-any
import axios, { type AxiosInstance } from "npm:axios"

class AriAPI {
  client: AxiosInstance
  constructor({
    baseUrl,
    username,
    password,
  }: {
    baseUrl: string
    username: string
    password: string
  }) {
    this.client = axios.create({
      baseURL: `${baseUrl.replace(/\/$/, "")}/ari`,
      auth: { username, password },
    })
  }

  // ------------- Channels ----------------
  channels = {
    list: () => this.client.get("/channels"),
    originate: (data: any) => this.client.post("/channels", data),
    get: (channelId: string) => this.client.get(`/channels/${channelId}`),
    hangup: (channelId: string) => this.client.delete(`/channels/${channelId}`),
    answer: (channelId: string) =>
      this.client.post(`/channels/${channelId}/answer`),
    continue: (
      channelId: string,
      context: any,
      extension: string,
      priority: string,
      label: string,
    ) =>
      this.client.post(`/channels/${channelId}/continue`, {
        context,
        extension,
        priority,
        label,
      }),
    ring: (channelId: string) =>
      this.client.post(`/channels/${channelId}/ring`),
    stopRing: (channelId: string) =>
      this.client.delete(`/channels/${channelId}/ring`),
    mute: (channelId: string, direction = "both") =>
      this.client.post(`/channels/${channelId}/mute`, { direction }),
    // unmute: (channelId: string, direction = "both") =>
    //   this.client.delete(`/channels/${channelId}/mute`, { direction }),
    hold: (channelId: string) =>
      this.client.post(`/channels/${channelId}/hold`),
    unhold: (channelId: string) =>
      this.client.delete(`/channels/${channelId}/hold`),
    snoop: (channelId: string, data: any) =>
      this.client.post(`/channels/${channelId}/snoop`, data),
    sendDTMF: (channelId: string, data: any) =>
      this.client.post(`/channels/${channelId}/sendDTMF`, data),
    record: (channelId: string, data: any) =>
      this.client.post(`/channels/${channelId}/record`, data),
    stopRecord: (channelId: string, recordingName: string) =>
      this.client.delete(`/channels/${channelId}/record/${recordingName}`),
    dial: (channelId: string) =>
      this.client.post(`/channels/${channelId}/dial`),
    play: (channelId: string, data: any) =>
      this.client.post(`/channels/${channelId}/play`, data),
    playLang: (channelId: string, lang: string, data: any) =>
      this.client.post(`/channels/${channelId}/play/${lang}`, data),
    stopPlayback: (channelId: string, playbackId: string) =>
      this.client.delete(`/channels/${channelId}/play/${playbackId}`),
    redirect: (channelId: string, data: any) =>
      this.client.post(`/channels/${channelId}/redirect`, data),
    move: (channelId: string, app: string) =>
      this.client.post(`/channels/${channelId}/move`, { app }),
    getVar: (channelId: string, variable: string) =>
      this.client.get(`/channels/${channelId}/variable`, {
        params: { variable },
      }),
    setVar: (channelId: string, data: any) =>
      this.client.post(`/channels/${channelId}/variable`, data),
  }

  // ------------- Bridges ----------------
  bridges = {
    list: () => this.client.get("/bridges"),
    create: (data: any) => this.client.post("/bridges", data),
    get: (bridgeId: string) => this.client.get(`/bridges/${bridgeId}`),
    destroy: (bridgeId: string) => this.client.delete(`/bridges/${bridgeId}`),
    addChannel: (bridgeId: string, data: any) =>
      this.client.post(`/bridges/${bridgeId}/addChannel`, data),
    removeChannel: (bridgeId: string, data: any) =>
      this.client.post(`/bridges/${bridgeId}/removeChannel`, data),
    play: (bridgeId: string, data: any) =>
      this.client.post(`/bridges/${bridgeId}/play`, data),
    stopPlayback: (bridgeId: string, playbackId: string) =>
      this.client.delete(`/bridges/${bridgeId}/play/${playbackId}`),
    record: (bridgeId: string, data: any) =>
      this.client.post(`/bridges/${bridgeId}/record`, data),
    stopRecord: (bridgeId: string, recordingName: string) =>
      this.client.delete(`/bridges/${bridgeId}/record/${recordingName}`),
    mohStart: (bridgeId: string) =>
      this.client.post(`/bridges/${bridgeId}/moh`),
    mohStop: (bridgeId: string) =>
      this.client.delete(`/bridges/${bridgeId}/moh`),
    startTalkDetect: (bridgeId: string) =>
      this.client.post(`/bridges/${bridgeId}/talk`),
    stopTalkDetect: (bridgeId: string) =>
      this.client.delete(`/bridges/${bridgeId}/talk`),
  }

  // ------------- Endpoints ----------------
  endpoints = {
    list: () => this.client.get("/endpoints"),
    listByTech: (tech: string) => this.client.get(`/endpoints/${tech}`),
    get: (tech: string, resource: any) =>
      this.client.get(`/endpoints/${tech}/${resource}`),
  }

  // ------------- Recordings ----------------
  recordings = {
    listStored: () => this.client.get("/recordings/stored"),
    getStored: (name: string) => this.client.get(`/recordings/stored/${name}`),
    deleteStored: (name: string) =>
      this.client.delete(`/recordings/stored/${name}`),
    copyStored: (name: string, data: any) =>
      this.client.post(`/recordings/stored/${name}/copy`, data),
    getLive: (name: string) => this.client.get(`/recordings/live/${name}`),
    stopLive: (name: string) => this.client.delete(`/recordings/live/${name}`),
    pauseLive: (name: string) =>
      this.client.post(`/recordings/live/${name}/pause`),
    unpauseLive: (name: string) =>
      this.client.delete(`/recordings/live/${name}/pause`),
    muteLive: (name: string) =>
      this.client.post(`/recordings/live/${name}/mute`),
    unmuteLive: (name: string) =>
      this.client.delete(`/recordings/live/${name}/mute`),
    stopAndStore: (name: string) =>
      this.client.post(`/recordings/live/${name}/stop`),
  }

  // ------------- Playbacks ----------------
  playbacks = {
    get: (id: string) => this.client.get(`/playbacks/${id}`),
    stop: (id: string) => this.client.delete(`/playbacks/${id}`),
    control: (id: string, operation: any) =>
      this.client.post(`/playbacks/${id}/control`, { operation }),
    pause: (id: string) => this.client.post(`/playbacks/${id}/pause`),
    unpause: (id: string) => this.client.delete(`/playbacks/${id}/pause`),
    reverse: (id: string) => this.client.post(`/playbacks/${id}/reverse`),
    forward: (id: string) => this.client.post(`/playbacks/${id}/forward`),
  }

  // ------------- Device States ----------------
  deviceStates = {
    list: () => this.client.get("/deviceStates"),
    get: (device: string) => this.client.get(`/deviceStates/${device}`),
    set: (device: string, data: any) =>
      this.client.put(`/deviceStates/${device}`, data),
    delete: (device: string) => this.client.delete(`/deviceStates/${device}`),
  }

  // ------------- Applications ----------------
  applications = {
    list: () => this.client.get("/applications"),
    get: (appName: string) => this.client.get(`/applications/${appName}`),
    subscribe: (appName: string, data: any) =>
      this.client.post(`/applications/${appName}/subscription`, data),
    unsubscribe: (appName: string, data: any) =>
      this.client.delete(`/applications/${appName}/subscription`, { data }),
    addFilter: (appName: string, data: any) =>
      this.client.post(`/applications/${appName}/eventFilter`, data),
    removeFilter: (appName: string, data: any) =>
      this.client.delete(`/applications/${appName}/eventFilter`, { data }),
  }

  // ------------- Mailboxes ----------------
  mailboxes = {
    list: () => this.client.get("/mailboxes"),
    get: (name: string) => this.client.get(`/mailboxes/${name}`),
    update: (name: string, data: any) =>
      this.client.put(`/mailboxes/${name}`, data),
    delete: (name: string) => this.client.delete(`/mailboxes/${name}`),
  }

  // ------------- Sounds ----------------
  sounds = {
    list: () => this.client.get("/sounds"),
    get: (soundId: string) => this.client.get(`/sounds/${soundId}`),
  }
}

module.exports = AriAPI
