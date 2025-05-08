import fs from "node:fs"
import dgram, { type RemoteInfo, type Socket } from "node:dgram"
import { Readable } from "node:stream"
import type { Buffer } from "node:buffer"

// Save original pipe method from Readable
const pipe = Readable.prototype.pipe

// Extend dgram.Socket to include a `pipe` method
interface PipedSocket extends Socket {
  pipe?: typeof pipe
}

export default class RtpUdpServerSocket {
  private server: PipedSocket
  private swap16: boolean
  private alsoWritePath: string
  private fileStream?: fs.WriteStream
  private address: string
  private port: number

  constructor(host: string, swap16: boolean, alsoWritePath: string) {
    this.server = dgram.createSocket("udp4") as PipedSocket

    // Attach stream pipe if needed
    this.server.pipe = pipe

    this.swap16 = swap16 ?? false
    this.alsoWritePath = alsoWritePath
    const [addr, port] = host.split(":")
    this.address = addr
    this.port = parseInt(port, 10)
    this.run()
  }

  run(): void {
    if (this.alsoWritePath) {
      this.fileStream = fs.createWriteStream(this.alsoWritePath, {
        autoClose: true,
      })
    }

    this.server.on("error", (err: Error) => {
      console.error(`server error:\n${err.stack}`)
      this.server.close()
      this.fileStream?.close()
    })

    this.server.on("close", () => {
      console.log("server socket closed")
      this.fileStream?.close()
    })

    this.server.on(
      "message",
      (msg: Buffer<ArrayBufferLike>, _rinfo: RemoteInfo) => {
        const buf = msg.subarray(12) // strip 12-byte RTP header
        if (this.swap16) {
          buf.swap16() // modifies buffer in-place
        }

        if (this.fileStream) {
          this.fileStream.write(buf)
        }

        this.server.emit("data", buf) // optional downstream piping
      },
    )

    this.server.on("listening", () => {
      const addr = this.server.address()
      if (typeof addr === "object") {
        console.log(`server listening ${addr.address}:${addr.port}`)
      }
    })

    this.server.bind(this.port, this.address)
  }
}
