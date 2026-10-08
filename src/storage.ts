import crypto from 'node:crypto'
import path from 'node:path'
import { DeleteObjectsCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { HttpProxyAgent, HttpsProxyAgent } from 'hpagent'
import mime from 'mime-types'

export interface NeonConfig {
  endpoint: string
  bucket: string
  accessKeyId: string
  secretAccessKey: string
  path?: string
  customUrl?: string
  syncDelete?: boolean
}

export interface NeonObjectRef {
  endpoint: string
  bucket: string
  key: string
}

export const DEFAULT_PATH = '{year}/{month}/{md5}.{extName}'

// Endpoints look like https://br-xxx.storage.c-5.us-east-2.aws.neon.tech
const REGION_PATTERN = /\.storage\.(?:[a-z0-9-]+\.)?([a-z]{2}-[a-z]+-\d+)\.aws\.neon\.tech$/

export function normalizeEndpoint (endpoint: string): string {
  const trimmed = endpoint.trim().replace(/\/+$/, '')
  return /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`
}

export function regionFromEndpoint (endpoint: string): string {
  try {
    return new URL(normalizeEndpoint(endpoint)).hostname.match(REGION_PATTERN)?.[1] ?? 'auto'
  } catch {
    return 'auto'
  }
}

export function createClient (config: NeonConfig, proxy?: string): S3Client {
  const endpoint = normalizeEndpoint(config.endpoint)
  const agentOptions = { keepAlive: true, proxy: proxy ?? '' }
  return new S3Client({
    endpoint,
    region: regionFromEndpoint(endpoint),
    // Neon only supports path-style addressing
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId.trim(),
      secretAccessKey: config.secretAccessKey.trim()
    },
    ...(proxy
      ? {
          requestHandler: endpoint.startsWith('https:')
            ? { httpsAgent: new HttpsProxyAgent(agentOptions) }
            : { httpAgent: new HttpProxyAgent(agentOptions) }
        }
      : {})
  })
}

export interface KeyInput {
  fileName?: string
  extname?: string
  body: Buffer
  date?: Date
}

const pad = (value: number, length = 2) => String(value).padStart(length, '0')

export function formatKey (template: string, input: KeyInput): string {
  const date = input.date ?? new Date()
  const extname = input.extname ?? path.extname(input.fileName ?? '')
  const extName = extname.replace(/^\./, '')
  const fileName = path.basename(input.fileName ?? 'image', extname)
  const hash = (algorithm: string) => crypto.createHash(algorithm).update(input.body).digest('hex')
  const values: Record<string, () => string> = {
    year: () => String(date.getFullYear()),
    month: () => pad(date.getMonth() + 1),
    day: () => pad(date.getDate()),
    hour: () => pad(date.getHours()),
    minute: () => pad(date.getMinutes()),
    second: () => pad(date.getSeconds()),
    millisecond: () => pad(date.getMilliseconds(), 3),
    timestamp: () => String(date.getTime()),
    md5: () => hash('md5'),
    sha256: () => hash('sha256'),
    uuid: () => crypto.randomUUID(),
    fileName: () => fileName,
    extName: () => extName
  }
  const key = (template.trim() || DEFAULT_PATH)
    .replace(/\{(\w+)\}/g, (match, name: string) => values[name]?.() ?? match)
    .replace(/^\/+/, '')
    .replace(/\/{2,}/g, '/')
  // Drop the dangling dot when the template ends with ".{extName}" and the file has no extension
  return extName ? key : key.replace(/\.$/, '')
}

const encodeKey = (key: string) => key.split('/').map(encodeURIComponent).join('/')

export function publicUrl (config: NeonConfig, key: string): string {
  const customUrl = config.customUrl?.trim().replace(/\/+$/, '')
  if (customUrl) {
    return `${customUrl}/${encodeKey(key)}`
  }
  return `${normalizeEndpoint(config.endpoint)}/${config.bucket}/${encodeKey(key)}`
}

export function contentTypeFor (fileName?: string, extname?: string): string {
  return mime.lookup(extname || fileName || '') || 'application/octet-stream'
}

export async function putObject (client: S3Client, config: NeonConfig, key: string, body: Buffer, contentType: string) {
  await client.send(new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    Body: body,
    ContentType: contentType
    // No ACL: Neon rejects x-amz-acl with 501. Public access is set on the bucket instead.
  }))
}

export async function deleteObjects (client: S3Client, bucket: string, keys: string[]) {
  // DeleteObjects accepts at most 1,000 keys per request
  for (let i = 0; i < keys.length; i += 1000) {
    const result = await client.send(new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: { Objects: keys.slice(i, i + 1000).map((Key) => ({ Key })), Quiet: true }
    }))
    const failed = result.Errors ?? []
    if (failed.length > 0) {
      throw new Error(failed.map((item) => `${item.Key}: ${item.Message ?? item.Code}`).join('\n'))
    }
  }
}
