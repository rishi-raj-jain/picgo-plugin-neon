import type { IPicGo, IPluginConfig } from 'picgo'
import { t } from './i18n'
import { DEFAULT_PATH, type NeonConfig } from './storage'

export const UPLOADER = 'neon'

export function isNeonConfig (value: unknown): value is NeonConfig {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  const config = value as Record<string, unknown>
  return ['endpoint', 'bucket', 'accessKeyId', 'secretAccessKey']
    .every((field) => typeof config[field] === 'string' && (config[field] as string).trim() !== '')
}

export function getUserConfig (ctx: IPicGo): Partial<NeonConfig> {
  return ctx.getConfig<Partial<NeonConfig> | undefined>(`picBed.${UPLOADER}`) ?? {}
}

export function pluginConfig (ctx: IPicGo): IPluginConfig[] {
  const userConfig = getUserConfig(ctx)
  return [
    {
      name: 'endpoint',
      type: 'input',
      get alias () { return t(ctx, 'PICBED_NEON_ENDPOINT') },
      get message () { return t(ctx, 'PICBED_NEON_MESSAGE_ENDPOINT') },
      default: userConfig.endpoint ?? '',
      required: true
    },
    {
      name: 'bucket',
      type: 'input',
      get alias () { return t(ctx, 'PICBED_NEON_BUCKET') },
      get message () { return t(ctx, 'PICBED_NEON_MESSAGE_BUCKET') },
      default: userConfig.bucket ?? '',
      required: true
    },
    {
      name: 'accessKeyId',
      type: 'input',
      get alias () { return t(ctx, 'PICBED_NEON_ACCESS_KEY_ID') },
      get message () { return t(ctx, 'PICBED_NEON_MESSAGE_ACCESS_KEY_ID') },
      default: userConfig.accessKeyId ?? '',
      required: true
    },
    {
      name: 'secretAccessKey',
      type: 'password',
      get alias () { return t(ctx, 'PICBED_NEON_SECRET_ACCESS_KEY') },
      get message () { return t(ctx, 'PICBED_NEON_MESSAGE_SECRET_ACCESS_KEY') },
      default: userConfig.secretAccessKey ?? '',
      required: true
    },
    {
      name: 'path',
      type: 'input',
      get alias () { return t(ctx, 'PICBED_NEON_PATH') },
      get message () { return t(ctx, 'PICBED_NEON_MESSAGE_PATH') },
      default: userConfig.path || DEFAULT_PATH,
      required: false
    },
    {
      name: 'customUrl',
      type: 'input',
      get alias () { return t(ctx, 'PICBED_NEON_CUSTOM_URL') },
      get message () { return t(ctx, 'PICBED_NEON_MESSAGE_CUSTOM_URL') },
      default: userConfig.customUrl ?? '',
      required: false
    },
    {
      name: 'syncDelete',
      type: 'confirm',
      get alias () { return t(ctx, 'PICBED_NEON_SYNC_DELETE') },
      get message () { return t(ctx, 'PICBED_NEON_MESSAGE_SYNC_DELETE') },
      default: userConfig.syncDelete ?? false,
      required: false
    }
  ]
}
