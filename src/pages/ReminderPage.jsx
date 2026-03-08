import { Link } from 'react-router-dom'
import PageMeta from '../components/seo/PageMeta'
import { Bell, Sun, Moon, CalendarHeart, ArrowRight } from 'lucide-react'
import { useThemeStore } from '../stores/themeStore'
import { useBrochureStore } from '../stores/brochureStore'
import AnniversaryTimeline from '../components/reminder/AnniversaryTimeline'
import CustomReminderForm from '../components/reminder/CustomReminderForm'
import ReminderNotificationSettings from '../components/reminder/ReminderNotificationSettings'

export default function ReminderPage() {
  const { theme, toggleTheme } = useThemeStore()
  const fullName = useBrochureStore(s => s.fullName)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageMeta
        title="Funeral Anniversary Reminders — Never Forget a Date | FuneralPress"
        description="Set automatic anniversary and remembrance date reminders for your loved ones. Get WhatsApp or email notifications before each memorial date arrives."
        path="/reminders"
      />
      {/* Navbar */}
      <nav className="h-12 bg-background border-b border-border flex items-center justify-between px-4 shrink-0">
        <Link to="/" className="flex items-center gap-2 text-card-foreground hover:text-foreground transition-colors">
          <Bell size={18} className="text-primary" />
          <span className="text-sm font-semibold tracking-wide">Anniversary Reminders</span>
        </Link>
        <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1
            className="text-2xl font-bold text-foreground mb-2"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Memorial Anniversaries
          </h1>
          {fullName ? (
            <p className="text-sm text-muted-foreground">Remembering <span className="text-primary">{fullName}</span></p>
          ) : (
            <p className="text-sm text-muted-foreground">Load a brochure first to see computed dates, or add custom reminders below.</p>
          )}
        </div>

        {/* Anniversary Tracker Banner */}
        <Link
          to="/anniversaries"
          className="block mb-8 p-4 rounded-lg border-2 border-dashed hover:border-solid transition-all group"
          style={{ borderColor: '#C9A84C' }}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CalendarHeart size={20} className="text-primary shrink-0" />
              <div>
                <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                  Track Memorial Anniversaries
                </p>
                <p className="text-xs text-muted-foreground">
                  Never forget an important remembrance date. Set reminders, export to calendar, and create materials.
                </p>
              </div>
            </div>
            <ArrowRight size={18} className="text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
          </div>
        </Link>

        <div className="space-y-8">
          <AnniversaryTimeline />
          <CustomReminderForm />
          <ReminderNotificationSettings />
        </div>
      </div>
    </div>
  )
}
