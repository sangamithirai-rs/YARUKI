import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import {
  deleteMaterial,
  getMaterialUrl,
  getMaterials,
  updateMaterial,
  uploadMaterial,
  type StudyMaterial,
} from '../services/materialService'
import { getSubjects } from '../services/subjectService'
import type { Subject } from '../types/database'

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<StudyMaterial[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [title, setTitle] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [search, setSearch] = useState('')
  const [filterSubject, setFilterSubject] = useState('all')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [openingId, setOpeningId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editSubjectId, setEditSubjectId] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadMaterials() {
      try {
        setLoading(true)
        setError('')

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
          setError('Unable to load your materials. Please try again.')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadMaterials()

    return () => {
      isMounted = false
    }
  }, [])

  const subjectNames = useMemo(
    () => new Map(subjects.map((subject) => [subject.id, subject.name])),
    [subjects]
  )

  const filteredMaterials = useMemo(() => {
    const searchTerm = search.trim().toLowerCase()

    return materials.filter((material) => {
      const matchesSearch =
        !searchTerm ||
        material.title.toLowerCase().includes(searchTerm) ||
        (material.file_name ?? '').toLowerCase().includes(searchTerm)

      const matchesSubject =
        filterSubject === 'all' || material.subject_id === filterSubject

      return matchesSearch && matchesSubject
    })
  }, [materials, search, filterSubject])

  function formatDate(value: string) {
    return new Date(value).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  function formatFileType(material: StudyMaterial) {
    if (material.file_name?.includes('.')) {
      return material.file_name.split('.').pop()?.toUpperCase() ?? 'FILE'
    }

    if (material.file_type) {
      return material.file_type.split('/').pop()?.toUpperCase() ?? 'FILE'
    }

    return 'FILE'
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const cleanTitle = title.trim()

    if (!cleanTitle || !file) {
      setError('Please enter a title and choose a file.')
      return
    }

    try {
      setUploading(true)
      setError('')

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
      setError(
        'Unable to upload this material. Check the file size and try again.'
      )
    } finally {
      setUploading(false)
    }
  }

  async function handleOpen(material: StudyMaterial) {
    if (!material.file_path) {
      setError('This material does not have an available file.')
      return
    }

    try {
      setOpeningId(material.id)
      setError('')

      const url = await getMaterialUrl(material.file_path)
      window.open(url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      console.error('Unable to open material:', err)
      setError('Unable to open this file. Please try again.')
    } finally {
      setOpeningId(null)
    }
  }
  function handleStartEdit(material: StudyMaterial) {
  setEditingId(material.id)
  setEditTitle(material.title)
  setEditSubjectId(material.subject_id ?? '')
  setError('')
}

function handleCancelEdit() {
  setEditingId(null)
  setEditTitle('')
  setEditSubjectId('')
}

async function handleSaveEdit(materialId: string) {
  const cleanTitle = editTitle.trim()

  if (!cleanTitle) {
    setError('Please enter a material title.')
    return
  }

  try {
    setSavingId(materialId)
    setError('')

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
    setError('Unable to update this material. Please try again.')
  } finally {
    setSavingId(null)
  }
}

  async function handleDelete(material: StudyMaterial) {
    if (!material.file_path) {
      setError('This material has no stored file path and cannot be deleted here.')
      return
    }

    const confirmed = window.confirm(
      `Delete "${material.title}"? This will remove the stored file.`
    )

    if (!confirmed) {
      return
    }

    try {
      setDeletingId(material.id)
      setError('')

      await deleteMaterial(material.id, material.file_path)

      setMaterials((current) =>
        current.filter((item) => item.id !== material.id)
      )
    } catch (err) {
      console.error('Unable to delete material:', err)
      setError('Unable to delete this material. Please try again.')
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

      <section className="materials-overview">
        <article className="materials-summary-card">
          <span className="materials-summary-label">Saved materials</span>
          <strong>{materials.length}</strong>
          <span className="materials-summary-note">
            Files in your library
          </span>
        </article>

        <article className="materials-summary-card">
          <span className="materials-summary-label">Subjects</span>
          <strong>{subjects.length}</strong>
          <span className="materials-summary-note">
            Subjects available to organize
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
                maxLength={120}
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
                onChange={(event) =>
                  setFile(event.target.files?.[0] ?? null)
                }
                required
              />
              {file && (
                <p className="materials-selected-file">
                  Selected: {file.name}
                </p>
              )}
            </div>
          </div>

          {error && <p className="page-error">{error}</p>}

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
          <span className="materials-count">{filteredMaterials.length}</span>
        </div>

        <div className="materials-toolbar">
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
              <option value="">No subject</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="materials-state-card">
            <span className="state-spinner" />
            <p>Loading your materials...</p>
          </div>
        ) : filteredMaterials.length === 0 ? (
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
          </div>
        ) : (
          <div className="materials-grid">
            {filteredMaterials.map((material: StudyMaterial) => (
              <article className="material-card" key={material.id}>
                <div className="material-card-top">
                  <span className="material-file-type">
                    {formatFileType(material)}
                  </span>
                  <span className="material-added-date">
                    {formatDate(material.created_at)}
                  </span>
                </div>

                <div className="material-card-content">
  {editingId === material.id ? (
    <div className="materials-edit-fields">
      <div className="form-field">
        <label htmlFor={`edit-title-${material.id}`}>
          Material title
        </label>
        <input
          id={`edit-title-${material.id}`}
          type="text"
          value={editTitle}
          onChange={(event) => setEditTitle(event.target.value)}
          maxLength={120}
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
          onChange={(event) => setEditSubjectId(event.target.value)}
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
          ? subjectNames.get(material.subject_id) ?? 'Subject'
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
                  {editingId === material.id ? (
  <>
    <button
      type="button"
      className="page-primary-button"
      onClick={() => handleSaveEdit(material.id)}
      disabled={savingId === material.id}
    >
      {savingId === material.id ? 'Saving…' : 'Save changes'}
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
    disabled={savingId === material.id}
  >
    Edit
  </button>
)}

                  <button
                    type="button"
                    className="secondary-button material-delete-button"
                    onClick={() => handleDelete(material)}
                    disabled={
                      !material.file_path || deletingId === material.id
                    }
                  >
                    {deletingId === material.id ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}