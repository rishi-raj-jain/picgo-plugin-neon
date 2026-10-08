import type { IPicGo } from 'picgo'

const en = {
  PICBED_NEON: 'Neon Object Storage',
  PICBED_NEON_ENDPOINT: 'S3 endpoint',
  PICBED_NEON_MESSAGE_ENDPOINT: 'Branch S3 endpoint, e.g. https://br-xxx.storage.c-5.us-east-2.aws.neon.tech',
  PICBED_NEON_BUCKET: 'Bucket',
  PICBED_NEON_MESSAGE_BUCKET: 'Bucket name, e.g. images. Use a public_read bucket so links open without signing.',
  PICBED_NEON_ACCESS_KEY_ID: 'Access key ID',
  PICBED_NEON_MESSAGE_ACCESS_KEY_ID: 'Credential token_id (starts with nak_)',
  PICBED_NEON_SECRET_ACCESS_KEY: 'Secret access key',
  PICBED_NEON_MESSAGE_SECRET_ACCESS_KEY: 'Credential s3_secret_access_key',
  PICBED_NEON_PATH: 'Path',
  PICBED_NEON_MESSAGE_PATH: 'Object key template. Variables: {year} {month} {day} {hour} {minute} {second} {millisecond} {timestamp} {md5} {sha256} {uuid} {fileName} {extName}',
  PICBED_NEON_CUSTOM_URL: 'Custom URL',
  PICBED_NEON_MESSAGE_CUSTOM_URL: 'Optional CDN or custom domain in front of this bucket, e.g. https://img.example.com',
  PICBED_NEON_SYNC_DELETE: 'Sync delete',
  PICBED_NEON_MESSAGE_SYNC_DELETE: 'Also delete the object from Neon when it is deleted from the PicGo album',
  PICBED_NEON_ERROR_CONFIG: 'Neon Object Storage is not configured. Fill in the endpoint, bucket, access key ID and secret access key.',
  PICBED_NEON_ERROR_NO_DATA: '${fileName} has no image data to upload',
  PICBED_NEON_DELETE_FAILED: 'Delete from Neon failed'
}

type LocaleKey = keyof typeof en
type Locale = Record<LocaleKey, string>

const zhCN: Locale = {
  PICBED_NEON: 'Neon 对象存储',
  PICBED_NEON_ENDPOINT: 'S3 端点',
  PICBED_NEON_MESSAGE_ENDPOINT: '分支的 S3 端点，例如 https://br-xxx.storage.c-5.us-east-2.aws.neon.tech',
  PICBED_NEON_BUCKET: '存储桶',
  PICBED_NEON_MESSAGE_BUCKET: '存储桶名称，例如 images。请使用 public_read 存储桶，链接无需签名即可访问。',
  PICBED_NEON_ACCESS_KEY_ID: '访问密钥 ID',
  PICBED_NEON_MESSAGE_ACCESS_KEY_ID: '凭证的 token_id（以 nak_ 开头）',
  PICBED_NEON_SECRET_ACCESS_KEY: '访问密钥',
  PICBED_NEON_MESSAGE_SECRET_ACCESS_KEY: '凭证的 s3_secret_access_key',
  PICBED_NEON_PATH: '存储路径',
  PICBED_NEON_MESSAGE_PATH: '对象键模板。可用变量：{year} {month} {day} {hour} {minute} {second} {millisecond} {timestamp} {md5} {sha256} {uuid} {fileName} {extName}',
  PICBED_NEON_CUSTOM_URL: '自定义域名',
  PICBED_NEON_MESSAGE_CUSTOM_URL: '可选，指向该存储桶的 CDN 或自定义域名，例如 https://img.example.com',
  PICBED_NEON_SYNC_DELETE: '同步删除',
  PICBED_NEON_MESSAGE_SYNC_DELETE: '在 PicGo 相册中删除图片时，同时删除 Neon 中的对象',
  PICBED_NEON_ERROR_CONFIG: 'Neon 对象存储未配置。请填写端点、存储桶、访问密钥 ID 和访问密钥。',
  PICBED_NEON_ERROR_NO_DATA: '${fileName} 没有可上传的图片数据',
  PICBED_NEON_DELETE_FAILED: '从 Neon 删除失败'
}

const zhTW: Locale = {
  PICBED_NEON: 'Neon 物件儲存',
  PICBED_NEON_ENDPOINT: 'S3 端點',
  PICBED_NEON_MESSAGE_ENDPOINT: '分支的 S3 端點，例如 https://br-xxx.storage.c-5.us-east-2.aws.neon.tech',
  PICBED_NEON_BUCKET: '儲存桶',
  PICBED_NEON_MESSAGE_BUCKET: '儲存桶名稱，例如 images。請使用 public_read 儲存桶，連結無需簽名即可存取。',
  PICBED_NEON_ACCESS_KEY_ID: '存取金鑰 ID',
  PICBED_NEON_MESSAGE_ACCESS_KEY_ID: '憑證的 token_id（以 nak_ 開頭）',
  PICBED_NEON_SECRET_ACCESS_KEY: '存取金鑰',
  PICBED_NEON_MESSAGE_SECRET_ACCESS_KEY: '憑證的 s3_secret_access_key',
  PICBED_NEON_PATH: '儲存路徑',
  PICBED_NEON_MESSAGE_PATH: '物件鍵範本。可用變數：{year} {month} {day} {hour} {minute} {second} {millisecond} {timestamp} {md5} {sha256} {uuid} {fileName} {extName}',
  PICBED_NEON_CUSTOM_URL: '自訂網域',
  PICBED_NEON_MESSAGE_CUSTOM_URL: '選填，指向該儲存桶的 CDN 或自訂網域，例如 https://img.example.com',
  PICBED_NEON_SYNC_DELETE: '同步刪除',
  PICBED_NEON_MESSAGE_SYNC_DELETE: '在 PicGo 相簿中刪除圖片時，同時刪除 Neon 中的物件',
  PICBED_NEON_ERROR_CONFIG: 'Neon 物件儲存尚未設定。請填寫端點、儲存桶、存取金鑰 ID 與存取金鑰。',
  PICBED_NEON_ERROR_NO_DATA: '${fileName} 沒有可上傳的圖片資料',
  PICBED_NEON_DELETE_FAILED: '從 Neon 刪除失敗'
}

const ja: Locale = {
  PICBED_NEON: 'Neon オブジェクトストレージ',
  PICBED_NEON_ENDPOINT: 'S3 エンドポイント',
  PICBED_NEON_MESSAGE_ENDPOINT: 'ブランチの S3 エンドポイント（例：https://br-xxx.storage.c-5.us-east-2.aws.neon.tech）',
  PICBED_NEON_BUCKET: 'バケット',
  PICBED_NEON_MESSAGE_BUCKET: 'バケット名（例：images）。署名なしでリンクを開けるよう public_read のバケットを使用してください。',
  PICBED_NEON_ACCESS_KEY_ID: 'アクセスキー ID',
  PICBED_NEON_MESSAGE_ACCESS_KEY_ID: 'クレデンシャルの token_id（nak_ で始まります）',
  PICBED_NEON_SECRET_ACCESS_KEY: 'シークレットアクセスキー',
  PICBED_NEON_MESSAGE_SECRET_ACCESS_KEY: 'クレデンシャルの s3_secret_access_key',
  PICBED_NEON_PATH: 'パス',
  PICBED_NEON_MESSAGE_PATH: 'オブジェクトキーのテンプレート。変数：{year} {month} {day} {hour} {minute} {second} {millisecond} {timestamp} {md5} {sha256} {uuid} {fileName} {extName}',
  PICBED_NEON_CUSTOM_URL: 'カスタム URL',
  PICBED_NEON_MESSAGE_CUSTOM_URL: '任意。このバケットの前段にある CDN またはカスタムドメイン（例：https://img.example.com）',
  PICBED_NEON_SYNC_DELETE: '同期削除',
  PICBED_NEON_MESSAGE_SYNC_DELETE: 'PicGo のアルバムから削除したとき、Neon のオブジェクトも削除します',
  PICBED_NEON_ERROR_CONFIG: 'Neon オブジェクトストレージが未設定です。エンドポイント、バケット、アクセスキー ID、シークレットアクセスキーを入力してください。',
  PICBED_NEON_ERROR_NO_DATA: '${fileName} にアップロードする画像データがありません',
  PICBED_NEON_DELETE_FAILED: 'Neon からの削除に失敗しました'
}

const ko: Locale = {
  PICBED_NEON: 'Neon 오브젝트 스토리지',
  PICBED_NEON_ENDPOINT: 'S3 엔드포인트',
  PICBED_NEON_MESSAGE_ENDPOINT: '브랜치 S3 엔드포인트 (예: https://br-xxx.storage.c-5.us-east-2.aws.neon.tech)',
  PICBED_NEON_BUCKET: '버킷',
  PICBED_NEON_MESSAGE_BUCKET: '버킷 이름 (예: images). 서명 없이 링크가 열리도록 public_read 버킷을 사용하세요.',
  PICBED_NEON_ACCESS_KEY_ID: '액세스 키 ID',
  PICBED_NEON_MESSAGE_ACCESS_KEY_ID: '자격 증명의 token_id (nak_ 로 시작)',
  PICBED_NEON_SECRET_ACCESS_KEY: '시크릿 액세스 키',
  PICBED_NEON_MESSAGE_SECRET_ACCESS_KEY: '자격 증명의 s3_secret_access_key',
  PICBED_NEON_PATH: '경로',
  PICBED_NEON_MESSAGE_PATH: '오브젝트 키 템플릿. 변수: {year} {month} {day} {hour} {minute} {second} {millisecond} {timestamp} {md5} {sha256} {uuid} {fileName} {extName}',
  PICBED_NEON_CUSTOM_URL: '사용자 지정 URL',
  PICBED_NEON_MESSAGE_CUSTOM_URL: '선택 사항. 이 버킷 앞에 둔 CDN 또는 사용자 지정 도메인 (예: https://img.example.com)',
  PICBED_NEON_SYNC_DELETE: '동기화 삭제',
  PICBED_NEON_MESSAGE_SYNC_DELETE: 'PicGo 앨범에서 삭제할 때 Neon의 오브젝트도 함께 삭제합니다',
  PICBED_NEON_ERROR_CONFIG: 'Neon 오브젝트 스토리지가 설정되지 않았습니다. 엔드포인트, 버킷, 액세스 키 ID, 시크릿 액세스 키를 입력하세요.',
  PICBED_NEON_ERROR_NO_DATA: '${fileName} 에 업로드할 이미지 데이터가 없습니다',
  PICBED_NEON_DELETE_FAILED: 'Neon에서 삭제하지 못했습니다'
}

const locales: Record<string, Locale> = { en, 'zh-CN': zhCN, 'zh-TW': zhTW, ja, ko }

export function registerLocales (ctx: IPicGo) {
  for (const [language, locale] of Object.entries(locales)) {
    ctx.i18n.addLocale(language, locale)
  }
}

const interpolate = (text: string, args: Record<string, string> = {}) =>
  text.replace(/\$\{(\w+)\}/g, (match, name: string) => args[name] ?? match)

// PicGo returns the raw key for languages without our strings, so fall back to English
export function t (ctx: IPicGo, key: LocaleKey, args?: Record<string, string>): string {
  const translated = ctx.i18n.translate(key, args)
  return translated === key ? interpolate(en[key], args) : translated
}
