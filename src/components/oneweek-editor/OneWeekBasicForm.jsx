import { useOneWeekStore } from '../../stores/oneWeekStore'

const HEADER_OPTIONS = [
  'ONE WEEK OBSERVATION',
  'ONE WEEK CELEBRATION',
  'ONE WEEK MEMORIAL',
  'ONE WEEK REMEMBRANCE',
]

const TITLE_OPTIONS = ['', 'Opanin', 'Nana', 'Maame', 'Obaapanin', 'Togbe', 'Mama', 'Dr.', 'Prof.', 'Rev.', 'Elder', 'Deaconess', 'Hon.']

export default function OneWeekBasicForm() {
  const store = useOneWeekStore()

  const handlePhotoUpload = (e, field) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => store.updateField(field, ev.target.result)
    reader.readAsDataURL(file)
  }

  const inputClass = 'w-full bg-card border border-input rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60'

  return (
    <div className="space-y-4">
      {/* Header Title */}
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Header Title</label>
        <select
          value={HEADER_OPTIONS.includes(store.headerTitle) ? store.headerTitle : '__custom'}
          onChange={(e) => {
            if (e.target.value !== '__custom') store.updateField('headerTitle', e.target.value)
          }}
          className={inputClass}
        >
          {HEADER_OPTIONS.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
          {!HEADER_OPTIONS.includes(store.headerTitle) && (
            <option value="__custom">{store.headerTitle} (custom)</option>
          )}
        </select>
        <input
          type="text"
          value={store.headerTitle}
          onChange={(e) => store.updateField('headerTitle', e.target.value)}
          placeholder="Or type a custom header..."
          className={`${inputClass} mt-1.5`}
        />
      </div>

      {/* Header Subtitle */}
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Subtitle <span className="text-muted-foreground/60">(Optional)</span></label>
        <input type="text" value={store.headerSubtitle} onChange={(e) => store.updateField('headerSubtitle', e.target.value)} placeholder='e.g. "of the late"' className={inputClass} />
      </div>

      {/* Main Photo */}
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Main Portrait Photo</label>
        {store.photo ? (
          <div className="relative w-36 h-44 rounded-lg overflow-hidden border border-input">
            <img src={store.photo} alt="Portrait" className="w-full h-full object-cover" />
            <button onClick={() => store.updateField('photo', null)} className="absolute top-1 right-1 w-5 h-5 bg-red-600 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-500">&times;</button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-36 h-44 border-2 border-dashed border-input rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
            <span className="text-muted-foreground text-2xl mb-1">+</span>
            <span className="text-[10px] text-muted-foreground/60">Upload Photo</span>
            <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, 'photo')} className="hidden" />
          </label>
        )}
      </div>

      {/* Archive Photo */}
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Archive / Throwback Photo <span className="text-muted-foreground/60">(Optional)</span></label>
        {store.archivePhoto ? (
          <div className="relative w-24 h-28 rounded-lg overflow-hidden border border-input">
            <img src={store.archivePhoto} alt="Archive" className="w-full h-full object-cover" />
            <button onClick={() => store.updateField('archivePhoto', null)} className="absolute top-1 right-1 w-5 h-5 bg-red-600 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-500">&times;</button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-24 h-28 border-2 border-dashed border-input rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
            <span className="text-muted-foreground text-xl mb-0.5">+</span>
            <span className="text-[9px] text-muted-foreground/60 text-center px-1">Younger photo</span>
            <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(e, 'archivePhoto')} className="hidden" />
          </label>
        )}
        <p className="text-[10px] text-muted-foreground/60 mt-1">A smaller framed photo from younger years</p>
      </div>

      {/* Title */}
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Title / Honorific <span className="text-muted-foreground/60">(Optional)</span></label>
        <div className="flex gap-2">
          <select
            value={TITLE_OPTIONS.includes(store.title) ? store.title : '__custom'}
            onChange={(e) => {
              if (e.target.value !== '__custom') store.updateField('title', e.target.value)
            }}
            className={`${inputClass} w-32`}
          >
            <option value="">None</option>
            {TITLE_OPTIONS.filter(Boolean).map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
            {store.title && !TITLE_OPTIONS.includes(store.title) && (
              <option value="__custom">{store.title}</option>
            )}
          </select>
          <input
            type="text"
            value={store.title}
            onChange={(e) => store.updateField('title', e.target.value)}
            placeholder="Or type custom..."
            className={inputClass}
          />
        </div>
      </div>

      {/* Full Name */}
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Full Name of Deceased</label>
        <input type="text" value={store.fullName} onChange={(e) => store.updateField('fullName', e.target.value)} placeholder="e.g. Samuel Kwame Ansu" className={inputClass} />
      </div>

      {/* Alias */}
      <div>
        <label className="block text-xs text-muted-foreground mb-1">A.K.A / Alias <span className="text-muted-foreground/60">(Optional)</span></label>
        <input type="text" value={store.alias} onChange={(e) => store.updateField('alias', e.target.value)} placeholder='e.g. Lito' className={inputClass} />
      </div>

      {/* Age */}
      <div className="w-32">
        <label className="block text-xs text-muted-foreground mb-1">Age at Death</label>
        <input type="text" value={store.age} onChange={(e) => store.updateField('age', e.target.value)} placeholder="e.g. 77" className={inputClass} />
      </div>
    </div>
  )
}
