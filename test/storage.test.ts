import { describe, expect, it } from 'vitest'
import { contentTypeFor, formatKey, normalizeEndpoint, publicUrl, regionFromEndpoint } from '../src/storage'

const body = Buffer.from('hello')
const date = new Date(2026, 0, 5, 7, 8, 9, 10)

describe('regionFromEndpoint', () => {
  it('reads the AWS region from a Neon storage endpoint', () => {
    expect(regionFromEndpoint('https://br-round-truth-ayem6sdg.storage.c-5.us-east-2.aws.neon.tech')).toBe('us-east-2')
    expect(regionFromEndpoint('br-a.storage.eu-central-1.aws.neon.tech/')).toBe('eu-central-1')
  })

  it('falls back to auto for anything else', () => {
    expect(regionFromEndpoint('http://127.0.0.1:9000')).toBe('auto')
    expect(regionFromEndpoint('not a url')).toBe('auto')
  })
})

describe('normalizeEndpoint', () => {
  it('adds https and strips trailing slashes', () => {
    expect(normalizeEndpoint(' br-a.storage.c-5.us-east-2.aws.neon.tech// ')).toBe('https://br-a.storage.c-5.us-east-2.aws.neon.tech')
    expect(normalizeEndpoint('http://localhost:9000/')).toBe('http://localhost:9000')
  })
})

describe('formatKey', () => {
  it('fills date, hash and file name variables', () => {
    expect(formatKey('{year}/{month}/{day}/{hour}{minute}{second}{millisecond}-{fileName}.{extName}', { fileName: 'cat photo.png', body, date }))
      .toBe('2026/01/05/070809010-cat photo.png')
    expect(formatKey('{md5}.{extName}', { fileName: 'a.jpg', body, date })).toBe('5d41402abc4b2a76b9719d911017c592.jpg')
    expect(formatKey('{timestamp}', { body, date })).toBe(String(date.getTime()))
  })

  it('prefers extname from PicGo over the file name', () => {
    expect(formatKey('{fileName}.{extName}', { fileName: 'clip', extname: '.webp', body, date })).toBe('clip.webp')
  })

  it('cleans leading and repeated slashes and keeps unknown variables', () => {
    expect(formatKey('/img//{year}/{nope}/{fileName}.{extName}', { fileName: 'a.png', body, date })).toBe('img/2026/{nope}/a.png')
  })

  it('drops the trailing dot when the file has no extension', () => {
    expect(formatKey('{fileName}.{extName}', { fileName: 'README', body, date })).toBe('README')
  })

  it('uses the default template when the path is blank', () => {
    expect(formatKey('  ', { fileName: 'a.png', body, date })).toBe('2026/01/5d41402abc4b2a76b9719d911017c592.png')
  })
})

describe('publicUrl', () => {
  const config = { endpoint: 'https://br-a.storage.c-5.us-east-2.aws.neon.tech/', bucket: 'images', accessKeyId: 'a', secretAccessKey: 'b' }

  it('builds the path-style public URL and encodes each segment', () => {
    expect(publicUrl(config, '2026/01/cat photo#1.png')).toBe('https://br-a.storage.c-5.us-east-2.aws.neon.tech/images/2026/01/cat%20photo%231.png')
  })

  it('uses the custom URL without the bucket', () => {
    expect(publicUrl({ ...config, customUrl: 'https://img.example.com/' }, 'a/b.png')).toBe('https://img.example.com/a/b.png')
  })
})

describe('contentTypeFor', () => {
  it('maps extensions and defaults to octet-stream', () => {
    expect(contentTypeFor('a.png')).toBe('image/png')
    expect(contentTypeFor('clip', '.webp')).toBe('image/webp')
    expect(contentTypeFor('blob')).toBe('application/octet-stream')
  })
})
