import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import {
  ALLOWED_MATERIAL_EXTENSIONS,
  MAX_MATERIAL_SIZE_MB,
  createFolder,
  deleteFolder,
  deleteMaterial,
  getFolders,
  getMaterialUrl,
  getMaterials,
  renameFolder,
  updateMaterial,
  uploadMaterial,
  validateMaterialFile,
  type MaterialFolder,
  type StudyMaterial,
} from '../services/materialService'
import { getSubjects } from '../services/subjectService'
import type { Subject } from '../types/database'
import { getErrorMessage } from '../lib/errors'
import { dateKeyFromToday } from '../lib/dates'

const MAX_TITLE_LENGTH = 120
const MAX_FOLDER_NAME_LENGTH = 60
const NEW_FOLDER = '__new__'

type SortMode = 'newest' | 'oldest' | 'title'

type Rejected = { name: string; reason: string }

type FolderEditor = { mode: 'create' | 'rename'; value: string }

// React's types don't include the folder-picking attribute
const directoryInputProps = { webkitdirectory: '' } as Record<string, string>

function getExtension(name: string | null): string {
  if (!name || !name.includes('.')) return ''

  return name.split('.').pop()?.toLowerCase() ?? ''
}

function stripExtension(name: string): string {
  const dot = name.lastIndexOf('.')

  return dot > 0 ? name.slice(0, dot) : name
}

function titleFor(file: File): string {
  return stripExtension(file.name).slice(0, MAX_TITLE_LENGTH)
}

function getTypeClass(extension: string): string {
  if (extension === 'pdf') return 'material-type-pdf'
  if (['doc', 'docx'].includes(extension)) return 'material-type-doc'
  if (['xls', 'xlsx', 'csv'].includes(extension)) return 'material-type-sheet'
  if (['ppt', 'pptx'].includes(extension)) return 'material-type-slides'
  if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(extension)) {
    return 'material-type-image'
  }

  return ''
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<StudyMaterial[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [folders, setFolders] = useState<MaterialFolder[]>([])
  const [foldersReady, setFoldersReady] = useState(false)

  const [title, setTitle] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [rejected, setRejected] = useState<Rejected[]>([])
  const [folderChoice, setFolderChoice] = useState('')
  const [newFolderName, setNewFolderName] = useState('')
  const [uploadProgress, setUploadProgress] = useState<{
    done: number
    total: number
  } | null>(null)
  const [uploadNotice, setUploadNotice] = useState('')

  const [search, setSearch] = useState('')
  const [filterSubject, setFilterSubject] = useState('all')
  const [sortMode, setSortMode] = useState<SortMode>('newest')
  const [activeFolder, setActiveFolder] = useState('all')
  const [folderEditor, setFolderEditor] = useState<FolderEditor | null>(null)
  const [folderBusy, setFolderBusy] = useState(false)

  const [loading, setLoading] = useState(true)
  const [openingId, setOpeningId] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState('')
  const [libraryError, setLibraryError] = useState('')
  const filesInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editSubjectId, setEditSubjectId] = useState('')
  const [editFolderId, setEditFolderId] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)

  const uploading = uploadProgress !== null

  useEffect(() => {
    let isMounted = true

    async function loadMaterials() {
      const [materialsResult, subjectsResult, foldersResult] =
        await Promise.allSettled([
          getMaterials(),
          getSubjects(),
          getFolders(),
        ])

      if (!isMounted) {
        return
      }

      if (materialsResult.status === 'fulfilled') {
        setMaterials(materialsResult.value)
      } else {
        console.error('Unable to load materials:', materialsResult.reason)
        setLibraryError(
          getErrorMessage(
            materialsResult.reason,
            'Unable to load your materials. Please try again.'
          )
        )
      }

      if (subjectsResult.status === 'fulfilled') {
        setSubjects(subjectsResult.value)
      }

      // If the folders table does not exist yet, folders are simply hidden
      if (foldersResult.status === 'fulfilled') {
        setFolders(foldersResult.value)
        setFoldersReady(true)
      } else {
        console.warn('Folders are not available:', foldersResult.reason)
      }

      setLoading(false)
    }

    void loadMaterials()

    return () => {
      isMounted = false
    }
  }, [])

  const subjectNames = useMemo(
    () => new Map(subjects.map((subject) => [subject.id, subject.name])),
    [subjects]
  )

  const folderNames = useMemo(
    () => new Map(folders.map((folder) => [folder.id, folder.name])),
    [folders]
  )

  const folderCounts = useMemo(() => {
    const counts = new Map<string, number>()

    for (const material of materials) {
      if (material.folder_id) {
        counts.set(
          material.folder_id,
          (counts.get(material.folder_id) ?? 0) + 1
        )
      }
    }

    return counts
  }, [materials])

  const unfiledCount = materials.filter(
    (material) => !material.folder_id
  ).length

  const visibleMaterials = useMemo(() => {
    const searchTerm = search.trim().toLowerCase()

    return materials
      .filter((material) => {
        const matchesSearch =
          !searchTerm ||
          material.title.toLowerCase().includes(searchTerm) ||
          (material.file_name ?? '').toLowerCase().includes(searchTerm)

        const matchesSubject =
          filterSubject === 'all' ||
          (filterSubject === 'none'
            ? !material.subject_id
            : material.subject_id === filterSubject)

        const matchesFolder =
          activeFolder === 'all' ||
          (activeFolder === 'none'
            ? !material.folder_id
            : material.folder_id === activeFolder)

        return matchesSearch && matchesSubject && matchesFolder
      })
      .sort((a, b) => {
        if (sortMode === 'title') return a.title.localeCompare(b.title)
        if (sortMode === 'oldest') {
          return a.created_at.localeCompare(b.created_at)
        }

        return b.created_at.localeCompare(a.created_at)
      })
  }, [materials, search, filterSubject, activeFolder, sortMode])

  const weekStart = dateKeyFromToday(-6)
  const addedThisWeek = materials.filter(
    (material) => material.created_at.slice(0, 10) >= weekStart
  ).length
  const unassignedCount = materials.filter(
    (material) => !material.subject_id
  ).length

  const searchOrSubjectActive =
    search.trim() !== '' || filterSubject !== 'all'

  const filtersActive = searchOrSubjectActive || activeFolder !== 'all'

  const activeFolderRecord = folders.find(
    (folder) => folder.id === activeFolder
  )

  function formatFileType(material: StudyMaterial) {
    const extension = getExtension(material.file_name)

    if (extension) return extension.toUpperCase()

    if (material.file_type) {
      return material.file_type.split('/').pop()?.toUpperCase() ?? 'FILE'
    }

    return 'FILE'
  }

  // ---- choosing files ---------------------------------------------------

  function clearSelection() {
    setPendingFiles([])
    setRejected([])

    if (filesInputRef.current) filesInputRef.current.value = ''
    if (folderInputRef.current) folderInputRef.current.value = ''
  }

  function handleFilesChosen(
    list: FileList | null,
    fromFolder: boolean
  ) {
    const chosen = Array.from(list ?? [])

    if (chosen.length === 0) {
      return
    }

    const valid: File[] = []
    const skipped: Rejected[] = []

    for (const file of chosen) {
      const problem = validateMaterialFile(file)

      if (problem) {
        skipped.push({ name: file.name, reason: problem })
      } else {
        valid.push(file)
      }
    }

    setUploadError('')
    setUploadNotice('')
    setPendingFiles(valid)
    setRejected(skipped)

    if (valid.length === 1 && title.trim() === '') {
      setTitle(titleFor(valid[0]))
    }

    if (fromFolder && foldersReady) {
      const relative = (chosen[0] as File & { webkitRelativePath?: string })
        .webkitRelativePath
      const folderName = relative?.split('/')[0]?.trim()

      if (folderName) {
        const existing = folders.find(
          (folder) => folder.name.toLowerCase() === folderName.toLowerCase()
        )

        if (existing) {
          setFolderChoice(existing.id)
        } else {
          setFolderChoice(NEW_FOLDER)
          setNewFolderName(folderName.slice(0, MAX_FOLDER_NAME_LENGTH))
        }
      }
    }

    if (valid.length === 0) {
      setUploadError(
        fromFolder
          ? 'No supported files were found in that folder.'
          : 'None of the selected files can be uploaded.'
      )
    }
  }

  function removePending(index: number) {
    setPendingFiles((current) => current.filter((_, i) => i !== index))
  }

  // ---- uploading ----------------------------------------------------------

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (pendingFiles.length === 0) {
      setUploadError('Please choose at least one file.')
      return
    }

    const single = pendingFiles.length === 1
    const cleanTitle = title.trim()

    if (single && !cleanTitle) {
      setUploadError('Please enter a title for this file.')
      return
    }

    let folderId = folderChoice

    const cleanFolderName = newFolderName.trim()

    if (folderChoice === NEW_FOLDER) {
      if (!cleanFolderName) {
        setUploadError('Please enter a name for the new folder.')
        return
      }

      if (cleanFolderName.length > MAX_FOLDER_NAME_LENGTH) {
        setUploadError(
          `Folder names can be up to ${MAX_FOLDER_NAME_LENGTH} characters.`
        )
        return
      }
    }

    setUploadError('')
    setUploadNotice('')
    setUploadProgress({ done: 0, total: pendingFiles.length })

    try {
      if (folderChoice === NEW_FOLDER) {
        const existing = folders.find(
          (folder) =>
            folder.name.toLowerCase() === cleanFolderName.toLowerCase()
        )

        if (existing) {
          folderId = existing.id
        } else {
          const created = await createFolder(cleanFolderName)

          setFolders((current) =>
            [...current, created].sort((a, b) => a.name.localeCompare(b.name))
          )
          folderId = created.id
        }

        setFolderChoice(folderId)
        setNewFolderName('')
      }
    } catch (err) {
      setUploadError(getErrorMessage(err, 'Unable to create the folder.'))
      setUploadProgress(null)
      return
    }

    const uploaded: StudyMaterial[] = []
    const failed: Rejected[] = []
    const failedFiles: File[] = []

    for (const file of pendingFiles) {
      try {
        const created = await uploadMaterial(
          file,
          single ? cleanTitle : titleFor(file),
          subjectId || undefined,
          folderId || undefined
        )

        uploaded.push(created)
      } catch (err) {
        console.error('Unable to upload material:', err)
        failed.push({
          name: file.name,
          reason: getErrorMessage(err, 'Upload failed.'),
        })
        failedFiles.push(file)
      }

      setUploadProgress({
        done: uploaded.length + failed.length,
        total: pendingFiles.length,
      })
    }

    if (uploaded.length > 0) {
      setMaterials((current) => [...uploaded.slice().reverse(), ...current])
    }

    // Only the files that failed stay selected, so you can simply retry
    setPendingFiles(failedFiles)

    if (failedFiles.length === 0) {
      setTitle('')
      setSubjectId('')
      clearSelection()
    }

    if (uploaded.length > 0) {
      const where = folderId
        ? ` to “${
            folders.find((folder) => folder.id === folderId)?.name ??
            cleanFolderName ??
            'the folder'
          }”`
        : ''

      setUploadNotice(`${plural(uploaded.length, 'file')} uploaded${where}.`)
    }

    if (failed.length > 0) {
      setUploadError(
        `${plural(failed.length, 'file')} could not be uploaded: ` +
          failed
            .slice(0, 3)
            .map((item) => `${item.name} (${item.reason})`)
            .join('; ') +
          (failed.length > 3 ? ` and ${failed.length - 3} more` : '')
      )
    }

    setUploadProgress(null)
  }

  // ---- folders --------------------------------------------------------------

  function folderNameProblem(name: string, ignoreId?: string): string | null {
    if (!name) return 'Please enter a folder name.'

    if (name.length > MAX_FOLDER_NAME_LENGTH) {
      return `Folder names can be up to ${MAX_FOLDER_NAME_LENGTH} characters.`
    }

    if (
      folders.some(
        (folder) =>
          folder.id !== ignoreId &&
          folder.name.toLowerCase() === name.toLowerCase()
      )
    ) {
      return `You already have a folder named “${name}”.`
    }

    return null
  }

  async function handleFolderSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!folderEditor) return

    const name = folderEditor.value.trim()
    const renamingId =
      folderEditor.mode === 'rename' ? activeFolderRecord?.id : undefined
    const problem = folderNameProblem(name, renamingId)

    if (problem) {
      setLibraryError(problem)
      return
    }

    try {
      setFolderBusy(true)
      setLibraryError('')

      if (folderEditor.mode === 'create') {
        const created = await createFolder(name)

        setFolders((current) =>
          [...current, created].sort((a, b) => a.name.localeCompare(b.name))
        )
        setActiveFolder(created.id)
      } else if (renamingId) {
        const updated = await renameFolder(renamingId, name)

        setFolders((current) =>
          current
            .map((folder) => (folder.id === updated.id ? updated : folder))
            .sort((a, b) => a.name.localeCompare(b.name))
        )
      }

      setFolderEditor(null)
    } catch (err) {
      setLibraryError(getErrorMessage(err, 'Unable to save the folder.'))
    } finally {
      setFolderBusy(false)
    }
  }

  async function handleDeleteFolder() {
    if (!activeFolderRecord) return

    const count = folderCounts.get(activeFolderRecord.id) ?? 0

    const confirmed = window.confirm(
      count > 0
        ? `Delete the folder “${activeFolderRecord.name}”? Its ${plural(count, 'file')} will be kept and moved to “No folder”.`
        : `Delete the empty folder “${activeFolderRecord.name}”?`
    )

    if (!confirmed) return

    try {
      setFolderBusy(true)
      setLibraryError('')

      await deleteFolder(activeFolderRecord.id)

      setFolders((current) =>
        current.filter((folder) => folder.id !== activeFolderRecord.id)
      )
      setMaterials((current) =>
        current.map((material) =>
          material.folder_id === activeFolderRecord.id
            ? { ...material, folder_id: null }
            : material
        )
      )

      if (folderChoice === activeFolderRecord.id) {
        setFolderChoice('')
      }

      setActiveFolder('all')
      setFolderEditor(null)
    } catch (err) {
      setLibraryError(getErrorMessage(err, 'Unable to delete the folder.'))
    } finally {
      setFolderBusy(false)
    }
  }

  // ---- material actions -------------------------------------------------------

  async function handleOpen(material: StudyMaterial) {
    if (!material.file_path) {
      setLibraryError('This material does not have an available file.')
      return
    }

    // Open the tab straight away, inside the click, so pop-up blockers
    // allow it; the address is filled in once the link is ready.
    const tab = window.open('', '_blank')

    try {
      setOpeningId(material.id)
      setLibraryError('')

      const url = await getMaterialUrl(material.file_path)

      if (tab) {
        tab.opener = null
        tab.location.href = url
      } else {
        setLibraryError(
          'Your browser blocked the new tab. Allow pop-ups for this site, or use Download.'
        )
      }
    } catch (err) {
      console.error('Unable to open material:', err)
      tab?.close()
      setLibraryError(
        getErrorMessage(err, 'Unable to open this file. Please try again.')
      )
    } finally {
      setOpeningId(null)
    }
  }

  async function handleDownload(material: StudyMaterial) {
    if (!material.file_path) {
      setLibraryError('This material does not have an available file.')
      return
    }

    try {
      setDownloadingId(material.id)
      setLibraryError('')

      const url = await getMaterialUrl(
        material.file_path,
        material.file_name ?? material.title
      )

      const link = document.createElement('a')
      link.href = url
      link.rel = 'noopener noreferrer'
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err) {
      console.error('Unable to download material:', err)
      setLibraryError(
        getErrorMessage(err, 'Unable to download this file. Please try again.')
      )
    } finally {
      setDownloadingId(null)
    }
  }

  function handleStartEdit(material: StudyMaterial) {
    setEditingId(material.id)
    setEditTitle(material.title)
    setEditSubjectId(material.subject_id ?? '')
    setEditFolderId(material.folder_id ?? '')
    setLibraryError('')
  }

  function handleCancelEdit() {
    setEditingId(null)
    setEditTitle('')
    setEditSubjectId('')
    setEditFolderId('')
  }

  async function handleSaveEdit(materialId: string) {
    const cleanTitle = editTitle.trim()

    if (!cleanTitle) {
      setLibraryError('Please enter a material title.')
      return
    }

    try {
      setSavingId(materialId)
      setLibraryError('')

      const updatedMaterial = await updateMaterial(materialId, {
        title: cleanTitle,
        subjectId: editSubjectId || null,
        ...(foldersReady ? { folderId: editFolderId || null } : {}),
      })

      setMaterials((current) =>
        current.map((material) =>
          material.id === materialId ? updatedMaterial : material
        )
      )

      handleCancelEdit()
    } catch (err) {
      console.error('Unable to update material:', err)
      setLibraryError(
        getErrorMessage(err, 'Unable to update this material. Please try again.')
      )
    } finally {
      setSavingId(null)
    }
  }

  async function handleDelete(material: StudyMaterial) {
    const confirmed = window.confirm(
      material.file_path
        ? `Delete "${material.title}"? This will remove the stored file.`
        : `Delete "${material.title}"? It has no stored file, so only the entry is removed.`
    )

    if (!confirmed) {
      return
    }

    try {
      setDeletingId(material.id)
      setLibraryError('')

      await deleteMaterial(material.id, material.file_path)

      setMaterials((current) =>
        current.filter((item) => item.id !== material.id)
      )

      if (editingId === material.id) {
        handleCancelEdit()
      }
    } catch (err) {
      console.error('Unable to delete material:', err)
      setLibraryError(
        getErrorMessage(err, 'Unable to delete this material. Please try again.')
      )
    } finally {
      setDeletingId(null)
    }
  }

  const single = pendingFiles.length === 1
  const uploadLabel = uploading
    ? `Uploading ${Math.min(uploadProgress.done + 1, uploadProgress.total)} of ${uploadProgress.total}…`
    : pendingFiles.length > 1
      ? `Upload ${pendingFiles.length} files`
      : 'Upload material'

  return (
    <main className="page-main materials-page">
      <header className="page-header">
        <div>
          <p className="page-eyebrow">YOUR LEARNING LIBRARY</p>
          <h1>Study Materials</h1>
          <p className="page-subtitle">
            Keep your notes, documents, and learning resources in one place.
          </p>
        </div>
      </header>

      <section className="materials-overview materials-overview-3">
        <article className="materials-summary-card">
          <span className="materials-summary-label">Saved materials</span>
          <strong>{loading ? '—' : materials.length}</strong>
          <span className="materials-summary-note">Files in your library</span>
        </article>

        {foldersReady && (
          <article className="materials-summary-card">
            <span className="materials-summary-label">Folders</span>
            <strong>{loading ? '—' : folders.length}</strong>
            <span className="materials-summary-note">
              To keep related files together
            </span>
          </article>
        )}

        <article className="materials-summary-card">
          <span className="materials-summary-label">Added this week</span>
          <strong>{loading ? '—' : addedThisWeek}</strong>
          <span className="materials-summary-note">In the last 7 days</span>
        </article>

        <article className="materials-summary-card">
          <span className="materials-summary-label">Unassigned</span>
          <strong>{loading ? '—' : unassignedCount}</strong>
          <span className="materials-summary-note">
            Not linked to a subject yet
          </span>
        </article>
      </section>

      <section className="subject-form-card materials-upload-card">
        <div className="subject-form-header">
          <div>
            <p className="page-eyebrow">ADD TO YOUR LIBRARY</p>
            <h2>Upload materials</h2>
          </div>
        </div>

        {!loading && !foldersReady && (
          <p className="materials-notice materials-notice-info">
            Folders are not set up yet. To turn them on, run
            <code> supabase/material_folders.sql </code>
            once in the Supabase SQL Editor, then refresh this page.
          </p>
        )}

        <form className="subject-form" onSubmit={handleUpload}>
          <div className="materials-form-grid">
            <div className="form-field materials-file-field">
              <label htmlFor="material-files">Files</label>

              <div className="materials-pick-row">
                <label
                  htmlFor="material-files"
                  className="secondary-button materials-pick-button"
                >
                  Choose files
                </label>

                <input
                  ref={filesInputRef}
                  id="material-files"
                  className="materials-hidden-input"
                  type="file"
                  multiple
                  accept={ALLOWED_MATERIAL_EXTENSIONS.map(
                    (extension) => `.${extension}`
                  ).join(',')}
                  onChange={(event) =>
                    handleFilesChosen(event.target.files, false)
                  }
                />

                {foldersReady && (
                  <>
                    <label
                      htmlFor="material-folder-picker"
                      className="secondary-button materials-pick-button"
                    >
                      Choose a whole folder
                    </label>

                    <input
                      ref={folderInputRef}
                      id="material-folder-picker"
                      className="materials-hidden-input"
                      type="file"
                      multiple
                      {...directoryInputProps}
                      onChange={(event) =>
                        handleFilesChosen(event.target.files, true)
                      }
                    />
                  </>
                )}
              </div>

              <p className="materials-selected-file">
                {pendingFiles.length === 0
                  ? `Select as many as you like · up to ${MAX_MATERIAL_SIZE_MB} MB each · ${ALLOWED_MATERIAL_EXTENSIONS.join(', ')}`
                  : `${plural(pendingFiles.length, 'file')} selected`}
              </p>

              {pendingFiles.length > 0 && (
                <ul className="materials-pending-list">
                  {pendingFiles.map((file, index) => (
                    <li key={`${file.name}-${index}`}>
                      <span>{file.name}</span>

                      <button
                        type="button"
                        onClick={() => removePending(index)}
                        disabled={uploading}
                        aria-label={`Remove ${file.name}`}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {rejected.length > 0 && (
                <p className="materials-skipped">
                  Skipped {plural(rejected.length, 'file')}:{' '}
                  {rejected
                    .slice(0, 4)
                    .map((item) => `${item.name} (${item.reason})`)
                    .join('; ')}
                  {rejected.length > 4
                    ? ` and ${rejected.length - 4} more`
                    : ''}
                </p>
              )}

              {pendingFiles.length > 0 && (
                <button
                  type="button"
                  className="materials-link-button"
                  onClick={clearSelection}
                  disabled={uploading}
                >
                  Clear selection
                </button>
              )}
            </div>

            {single ? (
              <div className="form-field">
                <label htmlFor="material-title">Material title</label>
                <input
                  id="material-title"
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Biology revision notes"
                  maxLength={MAX_TITLE_LENGTH}
                />
              </div>
            ) : pendingFiles.length > 1 ? (
              <div className="form-field">
                <label>Titles</label>
                <p className="materials-selected-file">
                  Each file is saved with its own file name as the title. You
                  can rename them later.
                </p>
              </div>
            ) : (
              <div className="form-field">
                <label htmlFor="material-title">Material title</label>
                <input
                  id="material-title"
                  type="text"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Choose a file first"
                  maxLength={MAX_TITLE_LENGTH}
                  disabled
                />
              </div>
            )}

            <div className="form-field">
              <label htmlFor="material-subject">Subject (all files)</label>
              <select
                id="material-subject"
                value={subjectId}
                onChange={(event) => setSubjectId(event.target.value)}
              >
                <option value="">No subject</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>

            {foldersReady && (
              <div className="form-field">
                <label htmlFor="material-folder">Folder</label>
                <select
                  id="material-folder"
                  value={folderChoice}
                  onChange={(event) => setFolderChoice(event.target.value)}
                >
                  <option value="">No folder</option>
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                  <option value={NEW_FOLDER}>＋ New folder…</option>
                </select>

                {folderChoice === NEW_FOLDER && (
                  <input
                    aria-label="New folder name"
                    type="text"
                    className="materials-new-folder-input"
                    value={newFolderName}
                    onChange={(event) => setNewFolderName(event.target.value)}
                    placeholder="Folder name, e.g. Biology notes"
                    maxLength={MAX_FOLDER_NAME_LENGTH}
                  />
                )}
              </div>
            )}
          </div>

          {uploading && uploadProgress && (
            <div className="materials-progress" aria-hidden="true">
              <span
                style={{
                  width: `${Math.round(
                    (uploadProgress.done / uploadProgress.total) * 100
                  )}%`,
                }}
              />
            </div>
          )}

          {uploadNotice && (
            <p className="materials-notice materials-notice-success">
              {uploadNotice}
            </p>
          )}

          {uploadError && <p className="page-error">{uploadError}</p>}

          <div className="subject-form-actions">
            <button
              type="submit"
              className="page-primary-button"
              disabled={uploading || pendingFiles.length === 0}
            >
              {uploadLabel}
            </button>
          </div>
        </form>
      </section>

      <section className="materials-library-section">
        <div className="section-heading">
          <div>
            <p className="page-eyebrow">YOUR COLLECTION</p>
            <h2>Material library</h2>
          </div>
          <span className="materials-count">{visibleMaterials.length}</span>
        </div>

        {libraryError && <p className="page-error">{libraryError}</p>}

        {foldersReady && (
          <div className="materials-folders">
            <div className="materials-folder-chips" role="group" aria-label="Folders">
              <button
                type="button"
                className={activeFolder === 'all' ? 'active' : ''}
                onClick={() => setActiveFolder('all')}
              >
                All ({materials.length})
              </button>

              <button
                type="button"
                className={activeFolder === 'none' ? 'active' : ''}
                onClick={() => setActiveFolder('none')}
              >
                No folder ({unfiledCount})
              </button>

              {folders.map((folder) => (
                <button
                  type="button"
                  key={folder.id}
                  className={activeFolder === folder.id ? 'active' : ''}
                  onClick={() => setActiveFolder(folder.id)}
                >
                  📁 {folder.name} ({folderCounts.get(folder.id) ?? 0})
                </button>
              ))}

              <button
                type="button"
                className="materials-folder-add"
                onClick={() => setFolderEditor({ mode: 'create', value: '' })}
              >
                ＋ New folder
              </button>
            </div>

            {activeFolderRecord && !folderEditor && (
              <div className="materials-folder-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    setFolderEditor({
                      mode: 'rename',
                      value: activeFolderRecord.name,
                    })
                  }
                  disabled={folderBusy}
                >
                  Rename folder
                </button>

                <button
                  type="button"
                  className="secondary-button material-delete-button"
                  onClick={handleDeleteFolder}
                  disabled={folderBusy}
                >
                  Delete folder
                </button>
              </div>
            )}

            {folderEditor && (
              <form
                className="materials-folder-editor"
                onSubmit={handleFolderSubmit}
              >
                <input
                  aria-label="Folder name"
                  type="text"
                  value={folderEditor.value}
                  onChange={(event) =>
                    setFolderEditor({
                      ...folderEditor,
                      value: event.target.value,
                    })
                  }
                  placeholder="Folder name"
                  maxLength={MAX_FOLDER_NAME_LENGTH}
                  autoFocus
                />

                <button
                  type="submit"
                  className="page-primary-button"
                  disabled={folderBusy}
                >
                  {folderEditor.mode === 'create' ? 'Create folder' : 'Save name'}
                </button>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setFolderEditor(null)}
                  disabled={folderBusy}
                >
                  Cancel
                </button>
              </form>
            )}
          </div>
        )}

        <div className="materials-toolbar materials-toolbar-3">
          <div className="form-field materials-search-field">
            <label htmlFor="materials-search">Search materials</label>
            <input
              id="materials-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by title or filename"
            />
          </div>

          <div className="form-field materials-filter-field">
            <label htmlFor="materials-filter">Filter by subject</label>
            <select
              id="materials-filter"
              value={filterSubject}
              onChange={(event) => setFilterSubject(event.target.value)}
            >
              <option value="all">All subjects</option>
              <option value="none">No subject</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field materials-filter-field">
            <label htmlFor="materials-sort">Sort by</label>
            <select
              id="materials-sort"
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="title">Title (A–Z)</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="materials-state-card">
            <span className="state-spinner" />
            <p>Loading your materials...</p>
          </div>
        ) : visibleMaterials.length === 0 ? (
          <div className="materials-state-card">
            <h3>
              {materials.length === 0
                ? 'Your library is empty'
                : activeFolderRecord && !searchOrSubjectActive
                  ? 'This folder is empty'
                  : 'No matching materials'}
            </h3>
            <p>
              {materials.length === 0
                ? 'Upload your first file to keep your study resources organized.'
                : activeFolderRecord && !searchOrSubjectActive
                  ? 'Upload files into this folder, or move files here with Edit.'
                  : 'Try changing your search or filters.'}
            </p>
            {filtersActive && materials.length > 0 && (
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setSearch('')
                  setFilterSubject('all')
                  setActiveFolder('all')
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="materials-grid">
            {visibleMaterials.map((material) => {
              const isEditing = editingId === material.id

              return (
                <article className="material-card" key={material.id}>
                  <div className="material-card-top">
                    <span
                      className={`material-file-type ${getTypeClass(
                        getExtension(material.file_name)
                      )}`}
                    >
                      {formatFileType(material)}
                    </span>
                    <span className="material-added-date">
                      {formatDate(material.created_at)}
                    </span>
                  </div>

                  <div className="material-card-content">
                    {isEditing ? (
                      <div className="materials-edit-fields">
                        <div className="form-field">
                          <label htmlFor={`edit-title-${material.id}`}>
                            Material title
                          </label>
                          <input
                            id={`edit-title-${material.id}`}
                            type="text"
                            value={editTitle}
                            onChange={(event) =>
                              setEditTitle(event.target.value)
                            }
                            maxLength={MAX_TITLE_LENGTH}
                            required
                          />
                        </div>

                        <div className="form-field">
                          <label htmlFor={`edit-subject-${material.id}`}>
                            Subject
                          </label>
                          <select
                            id={`edit-subject-${material.id}`}
                            value={editSubjectId}
                            onChange={(event) =>
                              setEditSubjectId(event.target.value)
                            }
                          >
                            <option value="">No subject</option>
                            {subjects.map((subject) => (
                              <option key={subject.id} value={subject.id}>
                                {subject.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        {foldersReady && (
                          <div className="form-field">
                            <label htmlFor={`edit-folder-${material.id}`}>
                              Folder
                            </label>
                            <select
                              id={`edit-folder-${material.id}`}
                              value={editFolderId}
                              onChange={(event) =>
                                setEditFolderId(event.target.value)
                              }
                            >
                              <option value="">No folder</option>
                              {folders.map((folder) => (
                                <option key={folder.id} value={folder.id}>
                                  {folder.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        <h3>{material.title}</h3>
                        <p className="material-file-name">
                          {material.file_name ?? 'File name unavailable'}
                        </p>
                        <span className="material-subject-name">
                          {material.subject_id
                            ? (subjectNames.get(material.subject_id) ??
                              'Subject')
                            : 'Unassigned'}
                        </span>
                        {foldersReady &&
                          material.folder_id &&
                          folderNames.get(material.folder_id) && (
                            <span className="material-folder-name">
                              📁 {folderNames.get(material.folder_id)}
                            </span>
                          )}
                      </>
                    )}
                  </div>

                  <div className="material-card-actions">
                    <button
                      type="button"
                      className="page-primary-button"
                      onClick={() => handleOpen(material)}
                      disabled={
                        !material.file_path || openingId === material.id
                      }
                    >
                      {openingId === material.id ? 'Opening…' : 'Open file'}
                    </button>

                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => handleDownload(material)}
                      disabled={
                        !material.file_path || downloadingId === material.id
                      }
                    >
                      {downloadingId === material.id
                        ? 'Preparing…'
                        : 'Download'}
                    </button>

                    {isEditing ? (
                      <>
                        <button
                          type="button"
                          className="page-primary-button"
                          onClick={() => handleSaveEdit(material.id)}
                          disabled={savingId === material.id}
                        >
                          {savingId === material.id
                            ? 'Saving…'
                            : 'Save changes'}
                        </button>

                        <button
                          type="button"
                          className="secondary-button"
                          onClick={handleCancelEdit}
                          disabled={savingId === material.id}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => handleStartEdit(material)}
                      >
                        Edit
                      </button>
                    )}

                    <button
                      type="button"
                      className="secondary-button material-delete-button"
                      onClick={() => handleDelete(material)}
                      disabled={deletingId === material.id}
                    >
                      {deletingId === material.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
