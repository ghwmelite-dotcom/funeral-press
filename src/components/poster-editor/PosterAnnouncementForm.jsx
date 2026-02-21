import { usePosterStore } from '../../stores/posterStore'

export default function PosterAnnouncementForm() {
  const store = usePosterStore()
  const inputClass = 'w-full bg-card border border-input rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground/60'

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-muted-foreground mb-1">Announcement Text</label>
        <textarea
          value={store.announcementText}
          onChange={(e) => store.updateField('announcementText', e.target.value)}
          rows={10}
          placeholder="The Amoah Family of ..., the Mensah Family of ..., Chiefs and people of ..., with deep sorrow announce the death of their beloved ..."
          className={inputClass}
        />
      </div>
      <div className="p-3 bg-card/50 border border-border rounded-lg">
        <p className="text-[10px] text-primary font-medium mb-1">Writing Guide</p>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          This is the main announcement paragraph. Typically mentions the families, chiefs, and dignitaries announcing the death. Include hometown, clan, and community connections. This text appears prominently beside the portrait photo.
        </p>
      </div>
    </div>
  )
}
