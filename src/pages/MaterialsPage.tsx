import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import {
  ALLOWED_MATERIAL_EXTENSIONS,
  MAX_MATERIAL_SIZE_MB,
  deleteMaterial,
  getMaterialUrl,
  getMaterials,
  updateMaterial,
  uploadMaterial,
  validateMaterialFile,
  type StudyMaterial,
} from '../services/materialService'
import { getSubjects } from '../services/subjectService'
import type { Subject } from '../types/database'
import { getErrorMessage } from '../lib/errors'
import { dateKeyFromToday } from '../lib/dates'

const MAX_TITLE_LENGTH = 120

type SortMode = 'newest' | 'oldest' | 'title'

function getExtension(name: string | null): string {
  if (!name || !name.includes('.')) return ''

  return name.split('.').pop()?.toLowerCase() ?? ''
}

function stripExtension(name: string): string {
  const dot = name.lastIndexOf('.')

  return dot > 0 ? name.slice(0, dot) : name
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

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<StudyMaterial[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [title, setTitle] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [search, setSearch] = useState('')
  const [filterSubject, setFilterSubject] = useState('all')
  const [sortMode, setSortMode] = useState<SortMode>('newest')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [openingId, setOpeningId] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState('')
  const [libraryError, setLibraryError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editSubjectId, setEditSubjectId] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadMaterials() {
      try {
        const [materialsData, subjectsData] = await Promise.all([
          getMaterials(),
          getSubjects(),
        ])

        if (isMounted) {
          setMaterials(materialsData)
          setSubjects(subjectsData)
        }
      } catch (err) {
        console.error('Unable to load materials:', err)

        if (isMounted) {
          setLibraryError(
            getErrorMessage(
              err,
              'Unable to load your materials. Please try again.'
            )
          )
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
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

        return matchesSearch && matchesSubject
      })
      .sort((a, b) => {
        if (sortMode === 'title') return a.title.localeCompare(b.title)
        if (sortMode === 'oldest') {
          return a.created_at.localeCompare(b.created_at)
        }

        return b.created_at.localeCompare(a.created_at)
      })
  }, [materials, search, filterSubject, sortMode])

  const weekStart = dateKeyFromToday(-6)
  const addedThisWeek = materials.filter(
    (material) => material.created_at.slice(0, 10) >= weekStart
  ).length
  const unassignedCount = materials.filter(
    (material) => !material.subject_id
  ).length

  const filtersActive = search.trim() !== '' || filterSubject !== 'all'

  function formatFileType(material: StudyMaterial) {
    const extension = getExtension(material.file_name)

    if (extension) return extension.toUpperCase()

    if (material.file_type) {
      return material.file_type.split('/').pop()?.toUpperCase() ?? 'FILE'
    }

    return 'FILE'
  }

  function handleFileChange(selected: File | null, input: HTMLInputElement) {
    const problem = selected ? validateMaterialFile(selected) : null

    if (problem) {
      setUploadError(problem)
      setFile(null)
      input.value = ''
      return
    }

    setUploadError('')
    setFile(selected)

    // Save a step: suggest the file name as the title
    if (selected && title.trim() === '') {
      setTitle(stripExtension(selected.name).slice(0, MAX_TITLE_LENGTH))
    }
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const cleanTitle = title.trim()

    if (!cleanTitle || !file) {
      setUploadError('Please enter a title and choose a file.')
      return
    }

    const validationError = validateMaterialFile(file)

    if (validationError) {
      setUploadError(validationError)
      return
    }

    try {
      setUploading(true)
      setUploadError('')

      const newMaterial = await uploadMaterial(
        file,
        cleanTitle,
        subjectId || undefined
      )

      setMaterials((current) => [newMaterial, ...current])
      setTitle('')
      setSubjectId('')
      setFile(null)

      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (err) {
      console.error('Unable to upload material:', err)
      setUploadError(
        getErrorMessage(err, 'Unable to upload this material. Please try again.')
      )
    } finally {
      setUploading(false)
    }
  }

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
    setLibraryError('')
  }

  function handleCancelEdit() {
    setEditingId(null)
    setEditTitle('')
    setEditSubjectId('')
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
            <h2>Upload a material</h2>
          </div>
        </div>

        <form className="subject-form" onSubmit={handleUpload}>
          <div className="materials-form-grid">
            <div className="form-field">
              <label htmlFor="material-title">Material title</label>
              <input
                id="material-title"
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="e.g. Biology revision notes"
                maxLength={MAX_TITLE_LENGTH}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="material-subject">Subject</label>
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

            <div className="form-field materials-file-field">
              <label htmlFor="material-file">Choose file</label>
              <input
                ref={fileInputRef}
                id="material-file"
                type="file"
                accept={ALLOWED_MATERIAL_EXTENSIONS.map(
                  (extension) => `.${extension}`
                ).join(',')}
                onChange={(event) =>
                  handleFileChange(
                    event.target.files?.[0] ?? null,
                    event.target
                  )
                }
                required
              />
              <p className="materials-selected-file">
                {file
                  ? `Selected: ${file.name}`
                  : `Up to ${MAX_MATERIAL_SIZE_MB} MB · ${ALLOWED_MATERIAL_EXTENSIONS.join(', ')}`}
              </p>
            </div>
          </div>

          {uploadError && <p className="page-error">{uploadError}</p>}

          <div className="subject-form-actions">
            <button
              type="submit"
              className="page-primary-button"
              disabled={uploading}
            >
              {uploading ? 'Uploading…' : 'Upload material'}
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
                : 'No matching materials'}
            </h3>
            <p>
              {materials.length === 0
                ? 'Upload your first file to keep your study resources organized.'
                : 'Try changing your search or subject filter.'}
            </p>
            {filtersActive && materials.length > 0 && (
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setSearch('')
                  setFilterSubject('all')
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
