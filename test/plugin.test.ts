import fs from 'node:fs'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import os from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { PicGo } from 'picgo'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

// Exercise the built CommonJS entry, the same file PicGo require()s
const plugin = createRequire(import.meta.url)('../dist/index.js')

interface RecordedRequest {
  method: string
  url: string
  headers: http.IncomingHttpHeaders
  body: Buffer
}

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')

let server: http.Server
let endpoint: string
let requests: RecordedRequest[] = []
let tmpDir: string
let imagePath: string

beforeAll(async () => {
  server = http.createServer((req, res) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => chunks.push(chunk))
    req.on('end', () => {
      requests.push({ method: req.method ?? '', url: req.url ?? '', headers: req.headers, body: Buffer.concat(chunks) })
      if (req.method === 'POST' && req.url?.includes('?delete')) {
        res.setHeader('Content-Type', 'application/xml')
        res.end('<?xml version="1.0" encoding="UTF-8"?><DeleteResult></DeleteResult>')
        return
      }
      res.setHeader('ETag', '"etag"')
      res.end()
    })
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  endpoint = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'picgo-plugin-neon-'))
  imagePath = path.join(tmpDir, 'pixel.png')
  fs.writeFileSync(imagePath, PNG)
})

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve))
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

beforeEach(() => {
  requests = []
})

function createPicGo (overrides: Record<string, unknown> = {}) {
  const configPath = path.join(tmpDir, `config-${Math.random().toString(36).slice(2)}.json`)
  fs.writeFileSync(configPath, '{}')
  const picgo = new PicGo(configPath)
  picgo.use(plugin, 'picgo-plugin-neon')
  picgo.setConfig({
    'picBed.uploader': 'neon',
    'picBed.current': 'neon',
    'picBed.neon': {
      endpoint,
      bucket: 'images',
      accessKeyId: 'nak_test',
      secretAccessKey: 'secret',
      path: 'uploads/{md5}.{extName}',
      ...overrides
    }
  })
  return picgo
}

describe('picgo-plugin-neon', () => {
  it('registers the neon uploader with its config schema', () => {
    const picgo = createPicGo()
    const uploader = picgo.helper.uploader.get('neon')
    expect(uploader?.name).toBe('Neon Object Storage')
    expect(uploader?.config?.(picgo).map((field) => field.name))
      .toEqual(['endpoint', 'bucket', 'accessKeyId', 'secretAccessKey', 'path', 'customUrl', 'syncDelete'])
  })

  it('uploads with a path-style PUT, no ACL header, and returns the public URL', async () => {
    const picgo = createPicGo()
    const output = await picgo.upload([imagePath])

    const put = requests.find((req) => req.method === 'PUT')
    expect(new URL(put?.url ?? '', endpoint).pathname).toBe('/images/uploads/f829b914fc47cfc9c0747c119c27cf1b.png')
    expect(put?.headers['content-type']).toBe('image/png')
    expect(put?.headers['x-amz-acl']).toBeUndefined()
    expect(put?.headers.authorization).toMatch(/^AWS4-HMAC-SHA256 Credential=nak_test\//)
    expect(put?.body.equals(PNG)).toBe(true)

    expect(output).toHaveLength(1)
    expect(output[0].imgUrl).toBe(`${endpoint}/images/uploads/f829b914fc47cfc9c0747c119c27cf1b.png`)
    expect(output[0].neon).toEqual({ endpoint, bucket: 'images', key: 'uploads/f829b914fc47cfc9c0747c119c27cf1b.png' })
    expect(output[0].buffer).toBeUndefined()
  })

  it('uses the custom URL for output links', async () => {
    const picgo = createPicGo({ customUrl: 'https://img.example.com/' })
    const output = await picgo.upload([imagePath])
    expect(output[0].imgUrl).toBe('https://img.example.com/uploads/f829b914fc47cfc9c0747c119c27cf1b.png')
  })

  it('notifies with a readable error when the config is incomplete', async () => {
    const picgo = createPicGo({ secretAccessKey: '' })
    const notifications: Array<{ title: string, body: string }> = []
    picgo.on('notification', (payload: { title: string, body: string }) => notifications.push(payload))
    const output = await picgo.upload([imagePath])
    expect(output.every((item) => !item.imgUrl)).toBe(true)
    expect(requests).toHaveLength(0)
    expect(notifications).toContainEqual({ title: 'Upload failed', body: expect.stringContaining('Neon Object Storage is not configured') })
  })

  it('deletes the object on album removal only when sync delete is on', async () => {
    const files = [{ type: 'neon', imgUrl: 'x', neon: { endpoint, bucket: 'images', key: 'uploads/a.png' } }]

    createPicGo({ syncDelete: false }).emit('remove', files)
    await new Promise((resolve) => setTimeout(resolve, 200))
    expect(requests).toHaveLength(0)

    const notifications: unknown[] = []
    createPicGo({ syncDelete: true }).emit('remove', files, { showNotification: (n: unknown) => notifications.push(n) })
    await expect.poll(() => requests.length).toBe(1)
    expect(requests[0].method).toBe('POST')
    const url = new URL(requests[0].url, endpoint)
    expect(url.pathname.replace(/\/$/, '')).toBe('/images')
    expect(url.searchParams.has('delete')).toBe(true)
    expect(requests[0].body.toString()).toContain('<Key>uploads/a.png</Key>')
    expect(notifications).toEqual([])
  })

  it('ignores removed files from other uploaders', async () => {
    createPicGo({ syncDelete: true }).emit('remove', [{ type: 'github', imgUrl: 'x' }])
    await new Promise((resolve) => setTimeout(resolve, 200))
    expect(requests).toHaveLength(0)
  })
})
