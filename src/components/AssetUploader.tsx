import { useMemo, useRef, useState, type ChangeEvent, type DragEvent, type KeyboardEvent } from 'react'
import type { UploadedAssetRef } from '../types/intake'
import {
  AssetApiError,
  confirmUpload,
  removeAsset as removePersistedAsset,
  requestUpload,
  updateAssetStatus,
  uploadToSignedUrl,
  validateFileHint,
  type AssetBinding,
} from '../api/assets'

type ClientUploadState = 'pending' | 'uploading' | 'failed'

interface LocalUpload {
  key: string
  assetId?: string
  filename: string
  mimeType: string
  sizeBytes: number
  state: ClientUploadState
  progress: number
  reason?: string
}

interface AssetUploaderProps {
  assets: UploadedAssetRef[]
  binding?: AssetBinding
  ensureBinding: () => Promise<AssetBinding>
  onAssetsChange: (assets: UploadedAssetRef[]) => void
  requirementKey?: string
  label?: string
  hint?: string
  compact?: boolean
}

const stateLabel: Record<UploadedAssetRef['assetStatus'] | ClientUploadState, string> = {
  pending: 'Pending',
  uploading: 'Uploading',
  uploaded: 'Uploaded',
  scanning: 'Scanning',
  ready: 'Ready',
  rejected: 'Rejected',
  failed: 'Failed',
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export default function AssetUploader({
  assets,
  binding,
  ensureBinding,
  onAssetsChange,
  requirementKey,
  label = 'Company files',
  hint = 'Choose files or drag and drop. Files are uploaded directly to secure storage.',
  compact = false,
}: AssetUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const assetsRef = useRef(assets)
  assetsRef.current = assets
  const fileRefs = useRef(new Map<string, File>())
  const replaceAssetId = useRef<string | undefined>(undefined)
  const [localUploads, setLocalUploads] = useState<LocalUpload[]>([])
  const [dropActive, setDropActive] = useState(false)
  const [controlError, setControlError] = useState('')

  const visibleAssets = useMemo(
    () => assets.filter(asset => requirementKey ? asset.requirementKey === requirementKey : true),
    [assets, requirementKey],
  )

  const updateLocal = (key: string, patch: Partial<LocalUpload>) => {
    setLocalUploads(current => current.map(item => item.key === key ? { ...item, ...patch } : item))
  }

  const replaceAsset = (next: UploadedAssetRef) => {
    const current = assetsRef.current
    const updated = current.some(asset => asset.assetId === next.assetId)
      ? current.map(asset => asset.assetId === next.assetId ? next : asset)
      : [...current, next]
    assetsRef.current = updated
    onAssetsChange(updated)
  }

  const uploadFile = async (file: File, retryAssetId?: string) => {
    const key = `${retryAssetId || 'new'}-${file.name}-${Date.now()}-${Math.random()}`
    fileRefs.current.set(key, file)
    const hintError = validateFileHint(file)
    setLocalUploads(current => [...current, {
      key,
      assetId: retryAssetId,
      filename: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      state: hintError ? 'failed' : 'pending',
      progress: 0,
      reason: hintError || undefined,
    }])
    if (hintError) return

    let registeredAssetId: string | undefined
    try {
      setControlError('')
      const activeBinding = binding ?? await ensureBinding()
      const request = await requestUpload({
        ...activeBinding,
        filename: file.name,
        mimeType: file.type,
        fileSizeBytes: file.size,
        requirementKey,
        retryAssetId,
      })
      registeredAssetId = request.assetId
      updateLocal(key, { assetId: request.assetId, state: 'uploading' })
      replaceAsset({
        assetId: request.assetId,
        filename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        assetStatus: 'pending',
        scanStatus: 'pending',
        requirementKey,
      })
      await uploadToSignedUrl(request.uploadUrl, file, progress => updateLocal(key, { progress }))
      const confirmed = await confirmUpload(request.assetId, activeBinding)
      replaceAsset(confirmed)
      setLocalUploads(current => current.filter(item => item.key !== key))
      fileRefs.current.delete(key)
    } catch (error) {
      if (registeredAssetId) {
        try {
          const activeBinding = binding ?? await ensureBinding()
          await updateAssetStatus(registeredAssetId, activeBinding, 'failed', 'Signed upload failed; retry available')
          replaceAsset({
            assetId: registeredAssetId,
            filename: file.name,
            mimeType: file.type,
            sizeBytes: file.size,
            assetStatus: 'failed',
            scanStatus: 'failed',
            rejectionReason: 'Signed upload failed; retry available',
            requirementKey,
          })
        } catch {
          // Preserve the original upload error; the next retry can reconcile the row.
        }
      }
      const reason = error instanceof AssetApiError
        ? [...error.details, error.message].filter(Boolean).join(' ') || error.message
        : error instanceof Error ? error.message : 'Upload failed'
      updateLocal(key, { state: 'failed', reason })
      setControlError(reason)
    }
  }

  const acceptFiles = (files: FileList | File[]) => {
    const retryId = replaceAssetId.current
    replaceAssetId.current = undefined
    Array.from(files).forEach((file, index) => void uploadFile(file, index === 0 ? retryId : undefined))
  }

  const chooseFiles = () => inputRef.current?.click()
  const chooseReplacement = (assetId: string) => {
    replaceAssetId.current = assetId
    chooseFiles()
  }
  const retryLocal = (item: LocalUpload) => {
    const file = fileRefs.current.get(item.key)
    if (!file) {
      chooseReplacement(item.assetId || '')
      return
    }
    setLocalUploads(current => current.filter(candidate => candidate.key !== item.key))
    void uploadFile(file, item.assetId)
  }

  const removeAsset = async (asset: UploadedAssetRef) => {
    try {
      const activeBinding = binding ?? await ensureBinding()
      await removePersistedAsset(asset.assetId, activeBinding)
      const updated = assetsRef.current.filter(candidate => candidate.assetId !== asset.assetId)
      assetsRef.current = updated
      onAssetsChange(updated)
    } catch (error) {
      setControlError(error instanceof Error ? error.message : 'Could not remove asset')
    }
  }

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDropActive(false)
    if (event.dataTransfer.files.length) acceptFiles(event.dataTransfer.files)
  }
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      chooseFiles()
    }
  }
  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files?.length) acceptFiles(event.target.files)
    event.target.value = ''
  }

  return (
    <section aria-label={`${label} uploader`} style={{ marginBottom: compact ? '12px' : '22px' }}>
      <div style={{ fontSize: compact ? '12px' : '13px', fontWeight: 600, color: '#D4E4F0', marginBottom: '5px' }}>{label}</div>
      <div style={{ fontSize: '11px', color: '#4B6278', marginBottom: '8px', lineHeight: 1.5 }}>{hint}</div>
      <input ref={inputRef} type="file" multiple hidden onChange={onFileChange} aria-label={`Choose ${label}`} />
      <div
        role="button"
        tabIndex={0}
        onClick={chooseFiles}
        onKeyDown={onKeyDown}
        onDragEnter={event => { event.preventDefault(); setDropActive(true) }}
        onDragOver={event => event.preventDefault()}
        onDragLeave={() => setDropActive(false)}
        onDrop={onDrop}
        style={{
          border: `1.5px dashed ${dropActive ? '#39D6C7' : '#2A3441'}`,
          borderRadius: '8px',
          padding: compact ? '12px' : '18px',
          cursor: 'pointer',
          background: dropActive ? 'rgba(57,214,199,0.05)' : 'transparent',
          color: '#7F95A8',
          fontSize: '12px',
          textAlign: 'center',
        }}
      >
        <span aria-hidden="true" style={{ color: '#39D6C7', marginRight: '8px' }}>â†‘</span>
        Click to choose files or drag and drop
      </div>

      {(visibleAssets.length > 0 || localUploads.length > 0) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
          {visibleAssets.filter(asset => !localUploads.some(item => item.assetId === asset.assetId)).map(asset => {
            const reason = asset.rejectionReason
            const canRetry = asset.assetStatus === 'failed' || asset.assetStatus === 'rejected'
            return (
              <div key={asset.assetId} style={{ padding: '10px 12px', border: '1px solid #253344', borderRadius: '8px', background: '#0D1620' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '12px', color: '#D4E4F0', overflowWrap: 'anywhere' }}>{asset.filename}</div>
                    <div style={{ fontSize: '10px', color: '#4B6278', marginTop: '3px' }}>{formatBytes(asset.sizeBytes)} Â· {asset.mimeType}</div>
                  </div>
                  <span role="status" aria-live="polite" style={{ fontSize: '10px', color: asset.assetStatus === 'ready' ? '#39D6C7' : asset.assetStatus === 'failed' || asset.assetStatus === 'rejected' ? '#EF4444' : '#F59E0B' }}>
                    {stateLabel[asset.assetStatus]}
                  </span>
                </div>
                {reason && <div role="alert" style={{ fontSize: '11px', color: '#EF4444', marginTop: '6px' }}>{reason}</div>}
                <div style={{ display: 'flex', gap: '8px', marginTop: '7px' }}>
                  <button type="button" onClick={() => chooseReplacement(asset.assetId)} style={actionStyle}>{canRetry ? 'Retry / replace' : 'Replace'}</button>
                  <button type="button" onClick={() => void removeAsset(asset)} style={actionStyle}>Remove</button>
                </div>
              </div>
            )
          })}
          {localUploads.map(item => (
            <div key={item.key} style={{ padding: '10px 12px', border: '1px solid #253344', borderRadius: '8px', background: '#0D1620' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
                <span style={{ fontSize: '12px', color: '#D4E4F0', overflowWrap: 'anywhere' }}>{item.filename}</span>
                <span role="status" aria-live="polite" style={{ fontSize: '10px', color: item.state === 'failed' ? '#EF4444' : '#F59E0B' }}>
                  {stateLabel[item.state]}{item.state === 'uploading' ? ` ${item.progress}%` : ''}
                </span>
              </div>
              {item.state === 'uploading' && (
                <div aria-hidden="true" style={{ height: '3px', background: '#1A2535', borderRadius: '999px', marginTop: '7px' }}>
                  <div style={{ height: '100%', width: `${item.progress}%`, background: '#39D6C7', borderRadius: '999px' }} />
                </div>
              )}
              {item.reason && <div role="alert" style={{ fontSize: '11px', color: '#EF4444', marginTop: '6px' }}>{item.reason}</div>}
              {item.state === 'failed' && <button type="button" onClick={() => retryLocal(item)} style={{ ...actionStyle, marginTop: '7px' }}>Retry</button>}
            </div>
          ))}
        </div>
      )}

      {!binding && (
        <div style={{ fontSize: '11px', color: '#F59E0B', marginTop: '8px' }}>
          The first file will save this intake as a draft and attach the server-issued identifiers.
        </div>
      )}
      {controlError && <div role="alert" style={{ fontSize: '11px', color: '#EF4444', marginTop: '8px' }}>{controlError}</div>}
    </section>
  )
}

const actionStyle = {
  border: '1px solid #2A3441',
  background: 'transparent',
  color: '#7F95A8',
  borderRadius: '6px',
  padding: '4px 8px',
  fontSize: '10px',
  cursor: 'pointer',
} as const
