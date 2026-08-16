import type { UploadedAssetRef } from '../types/intake'
import { getApiAuthHeaders } from './auth'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '')
const ASSET_API = `${API_BASE_URL}/api/assets`

export interface AssetBinding {
  intakeId: string
  clientId: string
  referenceNumber: string
}

export interface UploadRequestInput extends AssetBinding {
  filename: string
  mimeType: string
  fileSizeBytes: number
  requirementKey?: string
  retryAssetId?: string
}

export interface UploadRequestResult {
  assetId: string
  uploadUrl: string
  token: string
  storageKey: string
  expiresIn: number
}

export interface AssetListResult {
  intakeId: string
  assets: UploadedAssetRef[]
  summary: {
    total: number
    ready: number
    pending: number
    rejected: number
    failed: number
  }
}

export class AssetApiError extends Error {
  status: number
  details: string[]

  constructor(message: string, status = 0, details: string[] = []) {
    super(message)
    this.name = 'AssetApiError'
    this.status = status
    this.details = details
  }
}

async function readJson<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({})) as Record<string, unknown>
  if (!response.ok) {
    const detailRows = Array.isArray(data.details) ? data.details : []
    const details = detailRows.map(item => {
      if (typeof item === 'string') return item
      if (item && typeof item === 'object' && 'message' in item) return String(item.message)
      return String(item)
    })
    throw new AssetApiError(String(data.error || 'Asset request failed'), response.status, details)
  }
  return data as T
}

export async function requestUpload(input: UploadRequestInput): Promise<UploadRequestResult> {
  const response = await fetch(`${ASSET_API}/upload-request`, {
    method: 'POST',
    credentials: 'include',
    headers: { ...await getApiAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  return readJson<UploadRequestResult>(response)
}

export function uploadToSignedUrl(
  uploadUrl: string,
  file: File,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open('PUT', uploadUrl)
    request.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
    request.upload.onprogress = event => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100))
    }
    request.onerror = () => reject(new AssetApiError('Signed upload failed. Check the connection and retry.'))
    request.onabort = () => reject(new AssetApiError('Signed upload was cancelled.'))
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        onProgress(100)
        resolve()
      } else {
        reject(new AssetApiError(`Signed upload failed with status ${request.status}`, request.status))
      }
    }
    request.send(file)
  })
}

export async function confirmUpload(assetId: string, binding: AssetBinding): Promise<UploadedAssetRef> {
  const response = await fetch(`${ASSET_API}/${encodeURIComponent(assetId)}/confirm-upload`, {
    method: 'POST',
    credentials: 'include',
    headers: { ...await getApiAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(binding),
  })
  return readJson<UploadedAssetRef>(response)
}

export async function listIntakeAssets(binding: AssetBinding): Promise<AssetListResult> {
  const query = new URLSearchParams({
    clientId: binding.clientId,
    referenceNumber: binding.referenceNumber,
  })
  const response = await fetch(
    `${ASSET_API}/intake/${encodeURIComponent(binding.intakeId)}?${query.toString()}`,
    { credentials: 'include', headers: await getApiAuthHeaders() },
  )
  return readJson<AssetListResult>(response)
}

export async function updateAssetStatus(
  assetId: string,
  binding: AssetBinding,
  status: 'scanning' | 'ready' | 'rejected' | 'failed',
  reason?: string,
): Promise<UploadedAssetRef> {
  const response = await fetch(`${ASSET_API}/${encodeURIComponent(assetId)}/status`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { ...await getApiAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...binding, status, reason }),
  })
  return readJson<UploadedAssetRef>(response)
}

export async function removeAsset(assetId: string, binding: AssetBinding): Promise<void> {
  const response = await fetch(`${ASSET_API}/${encodeURIComponent(assetId)}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: { ...await getApiAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(binding),
  })
  await readJson<{ success: true }>(response)
}

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/csv', 'application/zip',
  'font/ttf', 'font/otf', 'font/woff', 'font/woff2',
  'video/mp4', 'video/webm', 'audio/mpeg', 'audio/wav',
])
const DANGEROUS_EXTENSION = /\.(exe|bat|cmd|com|msi|scr|pif|sh|bash|ps1|vbs|js|wsf|jar|dll|sys|drv|cpl)$/i
const FILENAME_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._\- ]*$/
const MAX_UPLOAD_BYTES = Number(import.meta.env.VITE_MAX_UPLOAD_SIZE_MB || 25) * 1024 * 1024

/** Fast operator feedback only; the server remains authoritative. */
export function validateFileHint(file: File): string | null {
  if (!file.name || file.name.length > 255 || file.name.includes('..') || /[\\/]/.test(file.name)) {
    return 'Use a filename between 1 and 255 characters without folders or path sequences.'
  }
  if (!FILENAME_PATTERN.test(file.name)) {
    return 'Use letters, numbers, dots, hyphens, underscores, and spaces in the filename.'
  }
  if (DANGEROUS_EXTENSION.test(file.name)) return 'This file extension is not permitted.'
  if (!ALLOWED_MIME_TYPES.has(file.type.toLowerCase())) return `The file type ${file.type || 'unknown'} is not permitted.`
  if (file.size <= 0) return 'The selected file is empty.'
  if (file.size > MAX_UPLOAD_BYTES) return `The selected file exceeds the ${MAX_UPLOAD_BYTES / 1024 / 1024} MB limit.`
  return null
}
