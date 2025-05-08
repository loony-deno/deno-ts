const username = "loony";
const password = "password";
const appName = "loony";

const Authorization = "Basic " + btoa(`${username}:${password}`);

const createBridge = async (name: string) => {
  const url = "http://localhost:8088/ari/bridges";
  const headers = new Headers({
    Authorization,
    "Content-Type": "application/json",
  });

  // Optional: You can provide type (mixing, holding, dtmf_events, etc.) and bridgeId
  const body = JSON.stringify({
    type: "mixing",
    name,
  });

  const response = await fetch(url, {
    method: "POST",
    headers,
    body,
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Failed to create bridge:", error);
    return null;
  } else {
    const bridge = await response.json();
    console.log(`Ok. Bridge created. ${bridge.id}`);
    return bridge;
  }
};

const wait = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

const addChannelToBridge = async (bridgeId: string, channelId: string) => {
  const url = `http://localhost:8088/ari/bridges/${bridgeId}/addChannel?channel=${channelId}`;
  const headers = new Headers({
    Authorization,
  });

  const response = await fetch(url, {
    method: "POST",
    headers,
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(
      `Failed to add channel ${channelId} to bridge ${bridgeId}`,
      error
    );
  } else {
    console.log(`Channel ${channelId} added to bridge ${bridgeId}`);
  }
};

const answerCall = async (channelId: string) => {
  const url = `http://localhost:8088/ari/channels/${channelId}/answer`;
  const headers = new Headers({
    Authorization,
  });

  const response = await fetch(url, {
    method: "POST",
    headers,
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Answer call failed:", error);
    return false;
  } else {
    console.log(`Channel ${channelId} answered`);
    return true;
  }
};

const playAudio = async (channelId: string, audio: string) => {
  const url = `http://localhost:8088/ari/channels/${channelId}/play?media=sound:${audio}`;
  const headers = new Headers({
    Authorization,
  });

  const response = await fetch(url, {
    method: "POST",
    headers,
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Failed to play:", error);
  } else {
    console.log(`Audio ${audio} played to ChannelId: ${channelId}`);
  }
};

const createExternalMediaChannel = async () => {
  const host = "127.0.0.1";
  const port = 8081;
  const external_host = encodeURIComponent(`${host}:${port}`);

  const url = `http://localhost:8088/ari/channels/externalMedia?app=${appName}&external_host=${external_host}&format=slin16`;

  const headers = new Headers({
    Authorization,
  });
  const response = await fetch(url, {
    method: "POST",
    headers,
  });

  if (!response.ok) {
    console.error(
      "Failed to create external media channel:",
      await response.text()
    );
    return;
  } else {
    const channel = await response.json();
    console.log(`Ok. Created externalMedia ${channel.id}`);
    return channel;
  }
};

const getChannels = async () => {
  const url = `http://localhost:8088/ari/channels`;

  const headers = new Headers({
    Authorization,
  });
  const response = await fetch(url, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    console.error(
      "Failed to create external media channel:",
      await response.text()
    );
    return;
  } else {
    const channels = await response.json();
    return channels;
  }
};

const getBridges = async () => {
  const url = `http://localhost:8088/ari/bridges`;

  const headers = new Headers({
    Authorization,
  });
  const response = await fetch(url, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    console.error(
      "Failed to create external media channel:",
      await response.text()
    );
    return;
  } else {
    const bridges = await response.json();
    return bridges;
  }
};

const getBridgeById = async (bridgeId: string) => {
  const url = `http://localhost:8088/ari/bridges/${bridgeId}`;

  const headers = new Headers({
    Authorization,
  });
  const response = await fetch(url, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    console.error(
      "Failed to create external media channel:",
      await response.text()
    );
    return;
  } else {
    const bridges = await response.json();
    return bridges;
  }
};

export {
  createBridge,
  createExternalMediaChannel,
  wait,
  playAudio,
  addChannelToBridge,
  answerCall,
  getChannels,
  getBridges,
  getBridgeById,
};
