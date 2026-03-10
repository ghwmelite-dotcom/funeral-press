import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import '../pdf/styles'
import { getOneWeekTheme } from '../../utils/oneWeekDefaultData'

const A3_WIDTH = 841.89
const A3_HEIGHT = 1190.55

function GoldDivider({ color, width = '50%' }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width, alignSelf: 'center', marginTop: 8 }}>
      <View style={{ flex: 1, height: 0.5, backgroundColor: color }} />
      <View style={{ width: 6, height: 6, transform: 'rotate(45deg)', marginHorizontal: 4, backgroundColor: color }} />
      <View style={{ flex: 1, height: 0.5, backgroundColor: color }} />
    </View>
  )
}

function PhotoPlaceholder({ width, height, bg }) {
  return (
    <View style={{ width, height, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: '#999', backgroundColor: bg || '#1a1a1a' }}>
      <Text style={{ fontSize: 10, color: '#999', fontStyle: 'italic' }}>Photo</Text>
    </View>
  )
}

function AgeBadge({ age, theme }) {
  if (!age) return null
  return (
    <View style={{
      width: 90, height: 90, borderRadius: 45,
      borderWidth: 3, borderColor: theme.badgeBorder,
      backgroundColor: theme.badgeBg,
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ fontFamily: 'Playfair', fontSize: 8, letterSpacing: 2, color: theme.badgeText, textTransform: 'uppercase' }}>AGED</Text>
      <Text style={{ fontFamily: 'Playfair', fontWeight: 700, fontSize: 28, color: theme.badgeText, marginVertical: -2 }}>{age}</Text>
      <Text style={{ fontFamily: 'Playfair', fontSize: 8, letterSpacing: 2, color: theme.badgeText, textTransform: 'uppercase' }}>YEARS</Text>
    </View>
  )
}

function EventDetail({ label, value, theme }) {
  if (!value) return null
  return (
    <View style={{ alignItems: 'center', marginBottom: 12 }}>
      <View style={{ backgroundColor: theme.accent, paddingHorizontal: 14, paddingVertical: 3, borderRadius: 3, marginBottom: 6 }}>
        <Text style={{ fontFamily: 'Playfair', fontWeight: 700, fontSize: 9, letterSpacing: 2, color: theme.footerBg, textTransform: 'uppercase' }}>{label}</Text>
      </View>
      <Text style={{ fontFamily: 'EBGaramond', fontSize: 16, color: theme.detailsText, textAlign: 'center' }}>{value}</Text>
    </View>
  )
}

function FooterBand({ data, theme }) {
  return (
    <View style={{ paddingVertical: 14, paddingHorizontal: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.footerBg }}>
      <Text style={{ fontFamily: 'Playfair', fontWeight: 700, fontSize: 10, textAlign: 'center', letterSpacing: 2, color: theme.accent, textTransform: 'uppercase' }}>
        {data.invitationText || ''}
      </Text>
    </View>
  )
}

// ─── LAYOUT: Grand ──────────────────────────────────────────────────────────
function GrandLayout({ data, theme }) {
  return (
    <Page size={[A3_WIDTH, A3_HEIGHT]} style={{ fontFamily: 'EBGaramond', fontSize: 9 }}>
      {/* Header section */}
      <View style={{ paddingTop: 40, paddingBottom: 20, alignItems: 'center', backgroundColor: theme.headerBg }}>
        <Text style={{ fontFamily: 'Playfair', fontWeight: 700, fontSize: 48, letterSpacing: 3, color: theme.headerText, textAlign: 'center' }}>
          ONE WEEK
        </Text>
        <Text style={{ fontFamily: 'Playfair', fontWeight: 700, fontSize: 16, letterSpacing: 8, color: theme.headerText, textAlign: 'center', marginTop: -4, textTransform: 'uppercase' }}>
          {data.headerTitle?.replace(/one\s*week\s*/i, '') || 'OBSERVATION'}
        </Text>
        <GoldDivider color={theme.divider} width="30%" />
        {data.headerSubtitle ? (
          <Text style={{ fontFamily: 'Cormorant', fontStyle: 'italic', fontSize: 14, color: theme.bodyText, marginTop: 10, opacity: 0.8 }}>
            {data.headerSubtitle}
          </Text>
        ) : null}
      </View>

      {/* Photo section */}
      <View style={{ alignItems: 'center', paddingVertical: 20, paddingHorizontal: 40, backgroundColor: theme.bodyBg, flexDirection: 'row', justifyContent: 'center' }}>
        {/* Main photo with gold double border */}
        <View style={{ alignItems: 'center' }}>
          <View style={{ padding: 4, borderWidth: 2, borderColor: theme.accent }}>
            <View style={{ padding: 2, borderWidth: 1, borderColor: theme.accent }}>
              {data.photo ? (
                <Image src={data.photo} style={{ width: 320, height: 400, objectFit: 'cover' }} />
              ) : (
                <PhotoPlaceholder width={320} height={400} bg={theme.bodyBg} />
              )}
            </View>
          </View>
        </View>

        {/* Side section: archive photo + age badge */}
        <View style={{ marginLeft: 30, alignItems: 'center', justifyContent: 'center' }}>
          {data.archivePhoto ? (
            <View style={{ padding: 3, borderWidth: 2, borderColor: theme.accent, marginBottom: 20 }}>
              <Image src={data.archivePhoto} style={{ width: 100, height: 120, objectFit: 'cover' }} />
            </View>
          ) : null}
          <AgeBadge age={data.age} theme={theme} />
        </View>
      </View>

      {/* Name section */}
      <View style={{ paddingVertical: 20, paddingHorizontal: 40, alignItems: 'center', backgroundColor: theme.bodyBg }}>
        {data.title ? (
          <Text style={{ fontFamily: 'Cormorant', fontStyle: 'italic', fontSize: 18, color: theme.bodyText, marginBottom: 4 }}>{data.title}</Text>
        ) : null}
        <Text style={{ fontFamily: 'Playfair', fontWeight: 700, fontSize: 36, letterSpacing: 2, color: theme.nameText, textAlign: 'center', textTransform: 'uppercase' }}>
          {data.fullName || 'Full Name'}
        </Text>
        {data.alias ? (
          <Text style={{ fontFamily: 'EBGaramond', fontSize: 14, color: theme.bodyText, marginTop: 4, opacity: 0.85 }}>
            A.K.A {data.alias}
          </Text>
        ) : null}
      </View>

      {/* Gold divider strip */}
      <View style={{ height: 2, backgroundColor: theme.accent }} />

      {/* Event details panel */}
      <View style={{ flex: 1, paddingVertical: 24, paddingHorizontal: 60, backgroundColor: theme.detailsBg, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 40, width: '100%' }}>
          <EventDetail label="Date" value={data.eventDay ? `${data.eventDay}\n${data.eventDate}` : data.eventDate} theme={theme} />
          <EventDetail label="Venue" value={data.venue} theme={theme} />
          <EventDetail label="Time" value={data.time} theme={theme} />
        </View>
      </View>

      {/* Gold accent line */}
      <View style={{ height: 2, backgroundColor: theme.accent }} />

      {/* Footer */}
      <FooterBand data={data} theme={theme} />
    </Page>
  )
}

// ─── LAYOUT: Elegant ────────────────────────────────────────────────────────
function ElegantLayout({ data, theme }) {
  return (
    <Page size={[A3_WIDTH, A3_HEIGHT]} style={{ fontFamily: 'EBGaramond', fontSize: 9, backgroundColor: theme.bodyBg }}>
      {/* Decorative borders */}
      <View style={{ position: 'absolute', top: 16, left: 16, right: 16, bottom: 16, borderWidth: 2, borderColor: theme.accent }} />
      <View style={{ position: 'absolute', top: 22, left: 22, right: 22, bottom: 22, borderWidth: 0.5, borderColor: theme.accent, opacity: 0.5 }} />

      {/* Header */}
      <View style={{ paddingTop: 50, paddingBottom: 16, alignItems: 'center', marginHorizontal: 30 }}>
        <Text style={{ fontFamily: 'Playfair', fontWeight: 700, fontSize: 44, letterSpacing: 3, color: theme.headerText, textAlign: 'center' }}>
          ONE WEEK
        </Text>
        <Text style={{ fontFamily: 'Playfair', fontWeight: 700, fontSize: 14, letterSpacing: 8, color: theme.headerText, textAlign: 'center', marginTop: -2, textTransform: 'uppercase' }}>
          {data.headerTitle?.replace(/one\s*week\s*/i, '') || 'OBSERVATION'}
        </Text>
        <GoldDivider color={theme.divider} width="25%" />
        {data.headerSubtitle ? (
          <Text style={{ fontFamily: 'Cormorant', fontStyle: 'italic', fontSize: 13, color: theme.bodyText, marginTop: 8, opacity: 0.8 }}>{data.headerSubtitle}</Text>
        ) : null}
      </View>

      {/* Centered photo */}
      <View style={{ alignItems: 'center', paddingVertical: 16, marginHorizontal: 30 }}>
        <View style={{ borderWidth: 3, borderColor: theme.accent }}>
          {data.photo ? (
            <Image src={data.photo} style={{ width: 300, height: 380, objectFit: 'cover' }} />
          ) : (
            <PhotoPlaceholder width={300} height={380} bg={theme.bodyBg} />
          )}
        </View>
      </View>

      {/* Name + Age */}
      <View style={{ alignItems: 'center', paddingVertical: 16, marginHorizontal: 30 }}>
        {data.title ? (
          <Text style={{ fontFamily: 'Cormorant', fontStyle: 'italic', fontSize: 16, color: theme.bodyText, marginBottom: 4 }}>{data.title}</Text>
        ) : null}
        <Text style={{ fontFamily: 'Playfair', fontWeight: 700, fontSize: 32, letterSpacing: 2, color: theme.nameText, textAlign: 'center', textTransform: 'uppercase' }}>
          {data.fullName || 'Full Name'}
        </Text>
        {data.alias ? (
          <Text style={{ fontFamily: 'EBGaramond', fontSize: 13, color: theme.bodyText, marginTop: 4, opacity: 0.85 }}>A.K.A {data.alias}</Text>
        ) : null}
        <View style={{ marginTop: 12 }}>
          <AgeBadge age={data.age} theme={theme} />
        </View>
        <GoldDivider color={theme.divider} width="40%" />
      </View>

      {/* Archive photo if present */}
      {data.archivePhoto ? (
        <View style={{ alignItems: 'center', paddingBottom: 10 }}>
          <View style={{ padding: 3, borderWidth: 2, borderColor: theme.accent }}>
            <Image src={data.archivePhoto} style={{ width: 90, height: 110, objectFit: 'cover' }} />
          </View>
        </View>
      ) : null}

      {/* Event details */}
      <View style={{ flex: 1, paddingVertical: 20, paddingHorizontal: 60, backgroundColor: theme.detailsBg, marginHorizontal: 30, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', width: '100%' }}>
          <EventDetail label="Date" value={data.eventDay ? `${data.eventDay}\n${data.eventDate}` : data.eventDate} theme={theme} />
          <EventDetail label="Venue" value={data.venue} theme={theme} />
          <EventDetail label="Time" value={data.time} theme={theme} />
        </View>
      </View>

      {/* Footer */}
      <View style={{ paddingVertical: 12, paddingHorizontal: 50, alignItems: 'center', backgroundColor: theme.footerBg, marginHorizontal: 30, marginBottom: 30 }}>
        <Text style={{ fontFamily: 'Playfair', fontWeight: 700, fontSize: 9, letterSpacing: 2, color: theme.accent, textTransform: 'uppercase', textAlign: 'center' }}>
          {data.invitationText || ''}
        </Text>
      </View>
    </Page>
  )
}

// ─── LAYOUT: Centered ───────────────────────────────────────────────────────
function CenteredLayout({ data, theme }) {
  return (
    <Page size={[A3_WIDTH, A3_HEIGHT]} style={{ fontFamily: 'EBGaramond', fontSize: 9 }}>
      {/* Header */}
      <View style={{ paddingTop: 40, paddingBottom: 20, alignItems: 'center', backgroundColor: theme.headerBg }}>
        <Text style={{ fontFamily: 'Playfair', fontWeight: 700, fontSize: 44, letterSpacing: 3, color: theme.headerText, textAlign: 'center' }}>
          ONE WEEK
        </Text>
        <Text style={{ fontFamily: 'Playfair', fontWeight: 700, fontSize: 14, letterSpacing: 8, color: theme.headerText, textAlign: 'center', marginTop: -2, textTransform: 'uppercase' }}>
          {data.headerTitle?.replace(/one\s*week\s*/i, '') || 'OBSERVATION'}
        </Text>
        <GoldDivider color={theme.divider} width="30%" />
        {data.headerSubtitle ? (
          <Text style={{ fontFamily: 'Cormorant', fontStyle: 'italic', fontSize: 13, color: theme.bodyText, marginTop: 8, opacity: 0.8 }}>{data.headerSubtitle}</Text>
        ) : null}
      </View>

      {/* Everything stacked centered */}
      <View style={{ flex: 1, alignItems: 'center', paddingVertical: 24, paddingHorizontal: 60, backgroundColor: theme.bodyBg }}>
        {/* Photo */}
        <View style={{ padding: 4, borderWidth: 2, borderColor: theme.accent }}>
          {data.photo ? (
            <Image src={data.photo} style={{ width: 300, height: 380, objectFit: 'cover' }} />
          ) : (
            <PhotoPlaceholder width={300} height={380} bg={theme.bodyBg} />
          )}
        </View>

        {/* Name + details */}
        <View style={{ marginTop: 20, alignItems: 'center' }}>
          {data.title ? (
            <Text style={{ fontFamily: 'Cormorant', fontStyle: 'italic', fontSize: 16, color: theme.bodyText, marginBottom: 4 }}>{data.title}</Text>
          ) : null}
          <Text style={{ fontFamily: 'Playfair', fontWeight: 700, fontSize: 34, letterSpacing: 2, color: theme.nameText, textAlign: 'center', textTransform: 'uppercase' }}>
            {data.fullName || 'Full Name'}
          </Text>
          {data.alias ? (
            <Text style={{ fontFamily: 'EBGaramond', fontSize: 13, color: theme.bodyText, marginTop: 4, opacity: 0.85 }}>A.K.A {data.alias}</Text>
          ) : null}
        </View>

        <View style={{ marginTop: 16 }}>
          <AgeBadge age={data.age} theme={theme} />
        </View>

        {/* Archive photo */}
        {data.archivePhoto ? (
          <View style={{ marginTop: 16, padding: 3, borderWidth: 2, borderColor: theme.accent }}>
            <Image src={data.archivePhoto} style={{ width: 80, height: 100, objectFit: 'cover' }} />
          </View>
        ) : null}
      </View>

      {/* Accent strip */}
      <View style={{ height: 3, backgroundColor: theme.accent }} />

      {/* Event details */}
      <View style={{ paddingVertical: 24, paddingHorizontal: 60, backgroundColor: theme.detailsBg, alignItems: 'center' }}>
        {data.eventDay ? (
          <Text style={{ fontFamily: 'Playfair', fontWeight: 700, fontSize: 14, letterSpacing: 3, color: theme.accent, textTransform: 'uppercase', marginBottom: 4 }}>
            {data.eventDay}
          </Text>
        ) : null}
        {data.eventDate ? (
          <Text style={{ fontFamily: 'Playfair', fontWeight: 700, fontSize: 22, color: theme.detailsText, marginBottom: 10 }}>
            {data.eventDate}
          </Text>
        ) : null}
        {data.venue ? (
          <Text style={{ fontFamily: 'EBGaramond', fontSize: 14, color: theme.detailsText, marginBottom: 6, textAlign: 'center' }}>
            Venue: {data.venue}
          </Text>
        ) : null}
        {data.time ? (
          <Text style={{ fontFamily: 'EBGaramond', fontSize: 14, color: theme.detailsText, textAlign: 'center' }}>
            Time: {data.time}
          </Text>
        ) : null}
      </View>

      <FooterBand data={data} theme={theme} />
    </Page>
  )
}

// ─── LAYOUT: Heritage ───────────────────────────────────────────────────────
function HeritageLayout({ data, theme }) {
  return (
    <Page size={[A3_WIDTH, A3_HEIGHT]} style={{ fontFamily: 'EBGaramond', fontSize: 9 }}>
      {/* Accent stripe + header */}
      <View style={{ height: 6, backgroundColor: theme.accent }} />
      <View style={{ paddingVertical: 30, paddingHorizontal: 40, alignItems: 'center', backgroundColor: theme.headerBg }}>
        <Text style={{ fontFamily: 'Playfair', fontWeight: 700, fontSize: 46, letterSpacing: 3, color: theme.headerText, textAlign: 'center' }}>
          ONE WEEK
        </Text>
        <Text style={{ fontFamily: 'Playfair', fontWeight: 700, fontSize: 15, letterSpacing: 8, color: theme.headerText, textAlign: 'center', marginTop: -2, textTransform: 'uppercase' }}>
          {data.headerTitle?.replace(/one\s*week\s*/i, '') || 'OBSERVATION'}
        </Text>
        <GoldDivider color={theme.divider} width="25%" />
        {data.headerSubtitle ? (
          <Text style={{ fontFamily: 'Cormorant', fontStyle: 'italic', fontSize: 13, color: theme.bodyText, marginTop: 8, opacity: 0.8 }}>{data.headerSubtitle}</Text>
        ) : null}
      </View>
      <View style={{ height: 3, backgroundColor: theme.accent }} />

      {/* Photo with thick accent border */}
      <View style={{ alignItems: 'center', paddingVertical: 20, backgroundColor: theme.bodyBg, flexDirection: 'row', justifyContent: 'center' }}>
        <View style={{ borderWidth: 4, borderColor: theme.accent }}>
          {data.photo ? (
            <Image src={data.photo} style={{ width: 300, height: 380, objectFit: 'cover' }} />
          ) : (
            <PhotoPlaceholder width={300} height={380} bg={theme.bodyBg} />
          )}
        </View>
        {data.archivePhoto ? (
          <View style={{ marginLeft: 24, alignItems: 'center' }}>
            <View style={{ padding: 3, borderWidth: 2, borderColor: theme.accent }}>
              <Image src={data.archivePhoto} style={{ width: 100, height: 120, objectFit: 'cover' }} />
            </View>
            <View style={{ marginTop: 14 }}>
              <AgeBadge age={data.age} theme={theme} />
            </View>
          </View>
        ) : (
          <View style={{ marginLeft: 24 }}>
            <AgeBadge age={data.age} theme={theme} />
          </View>
        )}
      </View>

      {/* Name band */}
      <View style={{ paddingVertical: 18, paddingHorizontal: 40, alignItems: 'center', backgroundColor: theme.accent }}>
        {data.title ? (
          <Text style={{ fontFamily: 'Cormorant', fontStyle: 'italic', fontSize: 15, color: theme.headerBg, marginBottom: 2 }}>{data.title}</Text>
        ) : null}
        <Text style={{ fontFamily: 'Playfair', fontWeight: 700, fontSize: 32, letterSpacing: 3, color: theme.headerBg, textAlign: 'center', textTransform: 'uppercase' }}>
          {data.fullName || 'Full Name'}
        </Text>
        {data.alias ? (
          <Text style={{ fontFamily: 'EBGaramond', fontSize: 13, color: theme.headerBg, marginTop: 3, opacity: 0.85 }}>A.K.A {data.alias}</Text>
        ) : null}
      </View>

      {/* Event details as card blocks */}
      <View style={{ flex: 1, paddingVertical: 24, paddingHorizontal: 50, backgroundColor: theme.detailsBg, justifyContent: 'center' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
          <View style={{ alignItems: 'center', padding: 16, borderWidth: 1, borderColor: theme.accent, borderRadius: 2, width: '30%' }}>
            <Text style={{ fontFamily: 'Playfair', fontWeight: 700, fontSize: 9, letterSpacing: 2, color: theme.accent, textTransform: 'uppercase', marginBottom: 6 }}>DATE</Text>
            {data.eventDay ? <Text style={{ fontFamily: 'EBGaramond', fontSize: 11, color: theme.detailsText, textAlign: 'center', marginBottom: 2 }}>{data.eventDay}</Text> : null}
            <Text style={{ fontFamily: 'Playfair', fontWeight: 700, fontSize: 16, color: theme.detailsText, textAlign: 'center' }}>{data.eventDate || ''}</Text>
          </View>
          <View style={{ alignItems: 'center', padding: 16, borderWidth: 1, borderColor: theme.accent, borderRadius: 2, width: '30%' }}>
            <Text style={{ fontFamily: 'Playfair', fontWeight: 700, fontSize: 9, letterSpacing: 2, color: theme.accent, textTransform: 'uppercase', marginBottom: 6 }}>VENUE</Text>
            <Text style={{ fontFamily: 'EBGaramond', fontSize: 14, color: theme.detailsText, textAlign: 'center' }}>{data.venue || ''}</Text>
          </View>
          <View style={{ alignItems: 'center', padding: 16, borderWidth: 1, borderColor: theme.accent, borderRadius: 2, width: '30%' }}>
            <Text style={{ fontFamily: 'Playfair', fontWeight: 700, fontSize: 9, letterSpacing: 2, color: theme.accent, textTransform: 'uppercase', marginBottom: 6 }}>TIME</Text>
            <Text style={{ fontFamily: 'EBGaramond', fontSize: 14, color: theme.detailsText, textAlign: 'center' }}>{data.time || ''}</Text>
          </View>
        </View>
      </View>

      {/* Footer */}
      <View style={{ height: 3, backgroundColor: theme.accent }} />
      <FooterBand data={data} theme={theme} />
    </Page>
  )
}

// ─── Main export ────────────────────────────────────────────────────────────
export default function OneWeekDocument({ data }) {
  const theme = getOneWeekTheme(data.theme)
  const layout = theme.layout || 'grand'

  return (
    <Document>
      {layout === 'grand' && <GrandLayout data={data} theme={theme} />}
      {layout === 'elegant' && <ElegantLayout data={data} theme={theme} />}
      {layout === 'centered' && <CenteredLayout data={data} theme={theme} />}
      {layout === 'heritage' && <HeritageLayout data={data} theme={theme} />}
    </Document>
  )
}
