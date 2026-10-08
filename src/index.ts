import type { IImgInfo, IPicGo } from 'picgo'
import { getUserConfig, isNeonConfig, pluginConfig, UPLOADER } from './config'
import { registerLocales, t } from './i18n'
import {
  contentTypeFor,
  createClient,
  DEFAULT_PATH,
  deleteObjects,
  formatKey,
  type NeonConfig,
  type NeonObjectRef,
  normalizeEndpoint,
  publicUrl,
  putObject
} from './storage'

interface GuiApi {
  showNotification: (options: { title: string, body: string }) => void
}

const errorMessage = (err: unknown) =>
  err instanceof Error ? (err.name && err.name !== 'Error' ? `${err.name}: ${err.message}` : err.message) : String(err)

const imageBody = (item: IImgInfo): Buffer | undefined => {
  if (item.buffer) {
    return Buffer.from(item.buffer)
  }
  if (item.base64Image) {
    return Buffer.from(item.base64Image.replace(/^data:[^;]+;base64,/, ''), 'base64')
  }
  return undefined
}

async function upload (ctx: IPicGo) {
  let client: ReturnType<typeof createClient> | undefined
  try {
    const config = getUserConfig(ctx)
    if (!isNeonConfig(config)) {
      throw new Error(t(ctx, 'PICBED_NEON_ERROR_CONFIG'))
    }
    const s3 = createClient(config, ctx.getConfig<string | undefined>('picBed.proxy'))
    client = s3
    await Promise.all(ctx.output.map(async (item) => {
      const body = imageBody(item)
      if (!body) {
        throw new Error(t(ctx, 'PICBED_NEON_ERROR_NO_DATA', { fileName: item.fileName ?? '' }))
      }
      const key = formatKey(config.path || DEFAULT_PATH, { fileName: item.fileName, extname: item.extname, body })
      await putObject(s3, config, key, body, contentTypeFor(item.fileName, item.extname))
      delete item.buffer
      delete item.base64Image
      item.imgUrl = publicUrl(config, key)
      item.url = item.imgUrl
      // Kept with the album entry so sync delete knows which object to remove
      const ref: NeonObjectRef = { endpoint: normalizeEndpoint(config.endpoint), bucket: config.bucket, key }
      item.neon = ref
    }))
    return ctx
  } catch (err) {
    ctx.emit('notification', {
      title: ctx.i18n.translate('UPLOAD_FAILED'),
      body: errorMessage(err)
    })
    throw err
  } finally {
    client?.destroy()
  }
}

const isObjectRef = (value: unknown): value is NeonObjectRef => {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const ref = value as Record<string, unknown>
  return typeof ref.endpoint === 'string' && typeof ref.bucket === 'string' && typeof ref.key === 'string'
}

// Every saved Neon config, so images uploaded with a non-default config can still be deleted
function savedConfigs (ctx: IPicGo): NeonConfig[] {
  const configs: unknown[] = [...(ctx.uploaderConfig?.getConfigList(UPLOADER) ?? []), getUserConfig(ctx)]
  return configs.filter(isNeonConfig)
}

async function removeFromNeon (ctx: IPicGo, files: unknown, guiApi: GuiApi | undefined) {
  if (!Array.isArray(files)) {
    return
  }
  const refs = files
    .filter((file: IImgInfo) => file?.type === UPLOADER && isObjectRef(file.neon))
    .map((file: IImgInfo) => file.neon as NeonObjectRef)
  if (refs.length === 0) {
    return
  }

  const groups = new Map<NeonConfig, string[]>()
  const configs = savedConfigs(ctx)
  for (const ref of refs) {
    const config = configs.find((item) =>
      normalizeEndpoint(item.endpoint) === ref.endpoint && item.bucket === ref.bucket)
    if (config?.syncDelete) {
      groups.set(config, [...(groups.get(config) ?? []), ref.key])
    }
  }

  for (const [config, keys] of groups) {
    const client = createClient(config, ctx.getConfig<string | undefined>('picBed.proxy'))
    try {
      await deleteObjects(client, config.bucket, keys)
      ctx.log.info(`[neon] deleted ${keys.length} object(s) from ${config.bucket}`)
    } catch (err) {
      const notification = { title: t(ctx, 'PICBED_NEON_DELETE_FAILED'), body: errorMessage(err) }
      ctx.log.error(notification.body)
      if (guiApi) {
        guiApi.showNotification(notification)
      } else {
        ctx.emit('notification', notification)
      }
    } finally {
      client.destroy()
    }
  }
}

export = (ctx: IPicGo) => {
  const register = () => {
    registerLocales(ctx)
    ctx.helper.uploader.register(UPLOADER, {
      get name () { return t(ctx, 'PICBED_NEON') },
      handle: upload,
      config: pluginConfig
    })
    ctx.on('remove', (files: unknown, guiApi?: GuiApi) => {
      removeFromNeon(ctx, files, guiApi).catch((err: unknown) => ctx.log.error(errorMessage(err)))
    })
  }
  return {
    register,
    uploader: UPLOADER
  }
}
