import crypto from 'node:crypto'
import fs from 'node:fs'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import net from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { DeleteObjectsCommand, HeadObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3'
import { PicGo } from 'picgo'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

// Runs against a real Neon branch. Configure .env.test (see .env.example) and run `pnpm test:live`.
const plugin = createRequire(import.meta.url)('../dist/index.js')

const env = {
  endpoint: process.env.NEON_S3_ENDPOINT ?? '',
  bucket: process.env.NEON_BUCKET ?? '',
  privateBucket: process.env.NEON_PRIVATE_BUCKET ?? '',
  accessKeyId: process.env.NEON_ACCESS_KEY_ID ?? '',
  secretAccessKey: process.env.NEON_SECRET_ACCESS_KEY ?? '',
  readonlyAccessKeyId: process.env.NEON_READONLY_ACCESS_KEY_ID ?? '',
  readonlySecretAccessKey: process.env.NEON_READONLY_SECRET_ACCESS_KEY ?? ''
}
const configured = Boolean(env.endpoint && env.bucket && env.accessKeyId && env.secretAccessKey)

interface Notification { title: string, body: string }

const runPrefix = `live/${Date.now()}-${crypto.randomBytes(3).toString('hex')}`
let tmpDir: string

// Each image gets unique bytes so {md5} keys never collide across tests or runs
function writeImage (name: string): string {
  const file = path.join(tmpDir, name)
  const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')
  fs.writeFileSync(file, Buffer.concat([pixel, crypto.randomBytes(16)]))
  return file
}

function createPicGo (overrides: Record<string, unknown> = {}) {
  const configPath = path.join(tmpDir, `config-${crypto.randomUUID()}.json`)
  fs.writeFileSync(configPath, '{}')
  const picgo = new PicGo(configPath)
  picgo.use(plugin, 'picgo-plugin-neon')
  picgo.setConfig({
    'picBed.uploader': 'neon',
    'picBed.current': 'neon',
    'picBed.neon': {
      endpoint: env.endpoint,
      bucket: env.bucket,
      accessKeyId: env.accessKeyId,
      secretAccessKey: env.secretAccessKey,
      path: `${runPrefix}/{md5}.{extName}`,
      ...overrides
    }
  })
  const notifications: Notification[] = []
  picgo.on('notification', (payload: Notification) => notifications.push(payload))
  return { picgo, notifications }
}

const s3 = () => new S3Client({
  endpoint: env.endpoint,
  region: 'auto',
  forcePathStyle: true,
  credentials: { accessKeyId: env.accessKeyId, secretAccessKey: env.secretAccessKey }
})

async function waitForStatus (url: string, status: number, timeoutMs = 20_000) {
  const started = Date.now()
  let last = 0
  while (Date.now() - started < timeoutMs) {
    last = (await fetch(url, { cache: 'no-store' })).status
    if (last === status) {
      return last
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  return last
}

describe.skipIf(!configured)('picgo-plugin-neon against live Neon Object Storage', { timeout: 90_000 }, () => {
  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'picgo-plugin-neon-live-'))
  })

  afterAll(async () => {
    fs.rmSync(tmpDir, { recursive: true, force: true })
    const client = s3()
    for (const bucket of [env.bucket, env.privateBucket].filter(Boolean)) {
      const listed = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: `${runPrefix}/` }))
      const keys = (listed.Contents ?? []).flatMap((item) => (item.Key ? [{ Key: item.Key }] : []))
      if (keys.length > 0) {
        await client.send(new DeleteObjectsCommand({ Bucket: bucket, Delete: { Objects: keys } }))
      }
    }
    client.destroy()
  })

  it('uploads a file and serves the exact bytes at the public URL', async () => {
    const { picgo, notifications } = createPicGo()
    const file = writeImage('pixel.png')
    const [item] = await picgo.upload([file])

    expect(notifications).toEqual([])
    expect(item.imgUrl).toMatch(new RegExp(`^${env.endpoint}/${env.bucket}/${runPrefix}/[0-9a-f]{32}\\.png$`))
    const res = await fetch(item.imgUrl!)
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('image/png')
    expect(Buffer.from(await res.arrayBuffer()).equals(fs.readFileSync(file))).toBe(true)

    const head = await s3().send(new HeadObjectCommand({ Bucket: env.bucket, Key: item.neon.key }))
    expect(head.ContentLength).toBe(fs.statSync(file).size)
  })

  it('uploads several files in one call', async () => {
    const { picgo } = createPicGo()
    const output = await picgo.upload([writeImage('a.png'), writeImage('b.jpg'), writeImage('c.webp')])
    expect(output).toHaveLength(3)
    const responses = await Promise.all(output.map((item) => fetch(item.imgUrl!)))
    expect(responses.map((res) => res.status)).toEqual([200, 200, 200])
    expect(responses.map((res) => res.headers.get('content-type'))).toEqual(['image/png', 'image/jpeg', 'image/webp'])
  })

  it('encodes spaces, # and non-ASCII names so the returned URL resolves', async () => {
    const { picgo } = createPicGo({ path: `${runPrefix}/names/{fileName}.{extName}` })
    const file = writeImage('cat photo #1 猫 ü.png')
    const [item] = await picgo.upload([file])

    expect(item.neon.key).toBe(`${runPrefix}/names/cat photo #1 猫 ü.png`)
    expect(item.imgUrl).toContain('cat%20photo%20%231%20%E7%8C%AB%20%C3%BC.png')
    const res = await fetch(item.imgUrl!)
    expect(res.status).toBe(200)
    expect(Buffer.from(await res.arrayBuffer()).equals(fs.readFileSync(file))).toBe(true)
  })

  it('uploads base64 input from the base64 transformer', async () => {
    const { picgo } = createPicGo()
    picgo.setConfig({ 'picBed.transformer': 'base64' })
    const bytes = fs.readFileSync(writeImage('b64.png'))
    const [item] = await picgo.upload([{ base64Image: `data:image/png;base64,${bytes.toString('base64')}`, fileName: 'b64.png', extname: '.png', width: 1, height: 1 }])
    const res = await fetch(item.imgUrl!)
    expect(res.status).toBe(200)
    expect(Buffer.from(await res.arrayBuffer()).equals(bytes)).toBe(true)
  })

  it('accepts an endpoint without a scheme or with a trailing slash', async () => {
    const { picgo } = createPicGo({ endpoint: `${env.endpoint.replace(/^https:\/\//, '')}/` })
    const [item] = await picgo.upload([writeImage('bare.png')])
    expect(item.imgUrl).toMatch(new RegExp(`^${env.endpoint}/${env.bucket}/`))
    expect((await fetch(item.imgUrl!)).status).toBe(200)
  })

  it('keeps the object when sync delete is off', async () => {
    const { picgo } = createPicGo({ syncDelete: false })
    const [item] = await picgo.upload([writeImage('keep.png')])
    picgo.emit('remove', [item])
    await new Promise((resolve) => setTimeout(resolve, 3000))
    expect((await fetch(item.imgUrl!, { cache: 'no-store' })).status).toBe(200)
  })

  it('deletes the object from Neon when sync delete is on', async () => {
    const { picgo } = createPicGo({ syncDelete: true })
    const [item] = await picgo.upload([writeImage('gone.png')])
    expect((await fetch(item.imgUrl!)).status).toBe(200)

    const guiNotifications: Notification[] = []
    picgo.emit('remove', [item], { showNotification: (n: Notification) => guiNotifications.push(n) })
    expect(await waitForStatus(item.imgUrl!, 404)).toBe(404)
    expect(guiNotifications).toEqual([])
  })

  it('finds the right saved config when deleting an image uploaded with a non-active one', async () => {
    const { picgo } = createPicGo()
    const shared = { endpoint: env.endpoint, accessKeyId: env.accessKeyId, secretAccessKey: env.secretAccessKey, path: `${runPrefix}/{md5}.{extName}` }
    picgo.uploaderConfig.createOrUpdate('neon', 'Public', { ...shared, bucket: env.bucket, syncDelete: true })
    picgo.uploaderConfig.createOrUpdate('neon', 'Other', { ...shared, bucket: 'some-other-bucket', syncDelete: false })

    picgo.uploaderConfig.use('neon', 'Public')
    const [item] = await picgo.upload([writeImage('multi.png')])
    expect((await fetch(item.imgUrl!)).status).toBe(200)

    picgo.uploaderConfig.use('neon', 'Other')
    picgo.emit('remove', [item])
    expect(await waitForStatus(item.imgUrl!, 404)).toBe(404)
  })

  it.skipIf(!env.privateBucket)('uploads to a private bucket but anonymous reads get 403', async () => {
    const { picgo, notifications } = createPicGo({ bucket: env.privateBucket })
    const [item] = await picgo.upload([writeImage('private.png')])
    expect(notifications).toEqual([])
    expect(item.imgUrl).toContain(`/${env.privateBucket}/`)
    const res = await fetch(item.imgUrl!)
    expect(res.status).toBe(403)
    expect(await res.text()).toContain('AccessDenied')
  })

  it.each([
    ['a missing bucket', { bucket: `missing-${crypto.randomBytes(4).toString('hex')}` }, 'NoSuchBucket'],
    ['a wrong access key ID', { accessKeyId: `nak_live_${'0'.repeat(32)}` }, 'InvalidAccessKeyId'],
    ['a wrong secret', { secretAccessKey: 'f'.repeat(64) }, 'SignatureDoesNotMatch']
  ])('reports %s in the failure notification', async (_label, overrides, errorName) => {
    const { picgo, notifications } = createPicGo(overrides)
    const output = await picgo.upload([writeImage('fail.png')])
    expect(output.every((item) => !item.imgUrl)).toBe(true)
    expect(notifications).toContainEqual({ title: 'Upload failed', body: expect.stringContaining(errorName) })
  })

  it.skipIf(!env.readonlyAccessKeyId)('reports AccessDenied for a credential without storage:write', async () => {
    const { picgo, notifications } = createPicGo({ accessKeyId: env.readonlyAccessKeyId, secretAccessKey: env.readonlySecretAccessKey })
    await picgo.upload([writeImage('readonly.png')])
    expect(notifications).toContainEqual({ title: 'Upload failed', body: expect.stringContaining('AccessDenied') })
  })

  it('uploads through the proxy set in PicGo', async () => {
    let tunnels = 0
    const proxy = http.createServer()
    proxy.on('connect', (req, client, head) => {
      tunnels++
      const [host, port] = (req.url ?? '').split(':')
      const upstream = net.connect(Number(port), host, () => {
        client.write('HTTP/1.1 200 Connection Established\r\n\r\n')
        upstream.write(head)
        upstream.pipe(client)
        client.pipe(upstream)
      })
      upstream.on('error', () => client.destroy())
      client.on('error', () => upstream.destroy())
    })
    await new Promise<void>((resolve) => proxy.listen(0, '127.0.0.1', resolve))
    try {
      const { picgo, notifications } = createPicGo()
      picgo.setConfig({ 'picBed.proxy': `http://127.0.0.1:${(proxy.address() as AddressInfo).port}` })
      const [item] = await picgo.upload([writeImage('proxied.png')])
      expect(notifications).toEqual([])
      expect(tunnels).toBeGreaterThan(0)
      expect((await fetch(item.imgUrl!)).status).toBe(200)
    } finally {
      proxy.closeAllConnections()
      await new Promise((resolve) => proxy.close(resolve))
    }
  })
})
