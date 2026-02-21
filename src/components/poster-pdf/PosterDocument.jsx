import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer'
import '../pdf/styles' // ensures fonts are registered
import { getPosterTheme } from '../../utils/posterDefaultData'

const A3_WIDTH = 841.89
const A3_HEIGHT = 1190.55

// ─── Shared helpers ──────────────────────────────────────────────────────────

function GoldDivider({ color, width = '50%' }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width, alignSelf: 'center', marginTop: 8 }}>
      <View style={{ flex: 1, height: 0.5, backgroundColor: color }} />
      <View style={{ width: 6, height: 6, transform: 'rotate(45deg)', marginHorizontal: 4, backgroundColor: color }} />
      <View style={{ flex: 1, height: 0.5, backgroundColor: color }} />
    </View>
  )
}

function FamilyField({ label, value, theme }) {
  if (!value) return null
  return (
    <View style={{ marginBottom: 4 }}>
      <Text style={{ fontFamily: 'Playfair', fontWeight: 700, fontSize: 7.5, letterSpacing: 1, textTransform: 'uppercase', color: theme.detailsText, opacity: 0.7 }}>{label}</Text>
      <Text style={{ fontFamily: 'EBGaramond', fontSize: 8.5, marginTop: 1, lineHeight: 1.4, color: theme.detailsText }}>{value}</Text>
    </View>
  )
}

function DetailsFreeform({ title, text, theme }) {
  if (!text) return null
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={{ fontFamily: 'Playfair', fontWeight: 700, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8, marginTop: 10, color: theme.detailsText }}>{title}</Text>
      <Text style={{ fontFamily: 'EBGaramond', fontSize: 8.5, lineHeight: 1.4, marginTop: 2, color: theme.detailsText }}>{text}</Text>
    </View>
  )
}

function PhotoFrame({ data, theme, width = 240, height = 300, borderStyle = 'double' }) {
  if (borderStyle === 'double') {
    return (
      <View style={{ padding: 4, borderWidth: 2, borderStyle: 'solid', borderColor: theme.accent }}>
        <View style={{ padding: 2, borderWidth: 1, borderStyle: 'solid', borderColor: theme.accent }}>
          {data.photo ? (
            <Image src={data.photo} style={{ width, height, objectFit: 'cover' }} />
          ) : (
            <View style={{ width, height, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: '#999999', backgroundColor: theme.bodyBg }}>
              <Text style={{ fontSize: 10, color: '#999999', fontStyle: 'italic' }}>Photo</Text>
            </View>
          )}
        </View>
      </View>
    )
  }
  if (borderStyle === 'accent-line') {
    return (
      <View style={{ borderWidth: 3, borderColor: theme.accent }}>
        {data.photo ? (
          <Image src={data.photo} style={{ width, height, objectFit: 'cover' }} />
        ) : (
          <View style={{ width, height, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: '#999999', backgroundColor: theme.bodyBg }}>
            <Text style={{ fontSize: 10, color: '#999999', fontStyle: 'italic' }}>Photo</Text>
          </View>
        )}
      </View>
    )
  }
  // simple
  return data.photo ? (
    <Image src={data.photo} style={{ width, height, objectFit: 'cover' }} />
  ) : (
    <View style={{ width, height, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed', borderColor: '#999999', backgroundColor: theme.bodyBg }}>
      <Text style={{ fontSize: 10, color: '#999999', fontStyle: 'italic' }}>Photo</Text>
    </View>
  )
}

function AgeBadge({ age, theme }) {
  if (!age) return null
  return (
    <View style={{ marginTop: 10, paddingHorizontal: 18, paddingVertical: 6, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.badgeBg }}>
      <Text style={{ fontFamily: 'Playfair', fontWeight: 700, fontSize: 10, letterSpacing: 1, color: theme.badgeText }}>
        Aged {age} yrs
      </Text>
    </View>
  )
}

function DeathDetails({ data, color }) {
  if (!data.dateOfDeath && !data.placeOfDeath) return null
  return (
    <Text style={{ fontFamily: 'EBGaramond', fontSize: 9, textAlign: 'center', marginTop: 6, letterSpacing: 0.5, color, opacity: 0.8 }}>
      {[data.dateOfDeath ? `Died: ${data.dateOfDeath}` : '', data.placeOfDeath ? `at ${data.placeOfDeath}` : ''].filter(Boolean).join(' ')}
    </Text>
  )
}

function FooterBand({ data, theme }) {
  return (
    <View style={{ paddingVertical: 10, paddingHorizontal: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.footerBg }}>
      <Text style={{ fontFamily: 'EBGaramond', fontSize: 9, textAlign: 'center', letterSpacing: 1, flex: 1, color: theme.headerText }}>
        {data.invitationText || ''}
      </Text>
      {data.dressCode ? (
        <View style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 3, marginLeft: 16, backgroundColor: theme.badgeBg }}>
          <Text style={{ fontFamily: 'Playfair', fontWeight: 700, fontSize: 7, letterSpacing: 1, textTransform: 'uppercase', color: theme.badgeText }}>
            {data.dressCode}
          </Text>
        </View>
      ) : null}
    </View>
  )
}

function getHasImmediateFamily(data) {
  return data.father || data.mother || data.widowWidower || data.children || data.grandchildren || data.siblings || data.inLaw
}

function getHasExtendedFamily(data) {
  return data.brothersSisters || data.cousins || data.nephewsNieces || data.chiefMourners
}

function ImmediateFamilyFields({ data, theme }) {
  return (
    <>
      <FamilyField label="FATHER" value={data.father} theme={theme} />
      <FamilyField label="MOTHER" value={data.mother} theme={theme} />
      <FamilyField label={data.widowWidowerLabel || 'WIDOW/WIDOWER'} value={data.widowWidower} theme={theme} />
      <FamilyField label="CHILDREN" value={data.children} theme={theme} />
      <FamilyField label="GRANDCHILDREN" value={data.grandchildren} theme={theme} />
      <FamilyField label="SIBLINGS" value={data.siblings} theme={theme} />
      <FamilyField label="IN-LAW" value={data.inLaw} theme={theme} />
    </>
  )
}

function ExtendedFamilyFields({ data, theme }) {
  return (
    <>
      <DetailsFreeform title="BROTHERS & SISTERS" text={data.brothersSisters} theme={theme} />
      <DetailsFreeform title="COUSINS" text={data.cousins} theme={theme} />
      <DetailsFreeform title="NEPHEWS & NIECES" text={data.nephewsNieces} theme={theme} />
      <DetailsFreeform title="CHIEF MOURNERS" text={data.chiefMourners} theme={theme} />
    </>
  )
}

function ArrangementsList({ data, theme }) {
  return (
    <>
      {data.funeralArrangements && data.funeralArrangements.map((item, idx) => (
        <View key={idx} style={{ marginBottom: 5 }}>
          {item.label ? <Text style={{ fontFamily: 'Playfair', fontWeight: 700, fontSize: 8, letterSpacing: 1, textTransform: 'uppercase', color: theme.detailsText }}>{item.label}</Text> : null}
          {item.value ? <Text style={{ fontFamily: 'EBGaramond', fontSize: 8.5, marginTop: 1, lineHeight: 1.4, color: theme.detailsText }}>{item.value}</Text> : null}
        </View>
      ))}
    </>
  )
}

// ─── LAYOUT: Classic ─────────────────────────────────────────────────────────
// Photo left, text right — royalBlue, midnightBlack

function ClassicLayout({ data, theme }) {
  return (
    <Page size={[A3_WIDTH, A3_HEIGHT]} style={{ fontFamily: 'EBGaramond', fontSize: 9 }}>
      {/* Header Band */}
      <View style={{ paddingVertical: 18, paddingHorizontal: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.headerBg }}>
        <Text style={{ fontFamily: 'Playfair', fontWeight: 700, fontSize: 24, letterSpacing: 6, textAlign: 'center', textTransform: 'uppercase', color: theme.headerText }}>
          {data.headerTitle || 'CALLED TO GLORY'}
        </Text>
        <GoldDivider color={theme.divider} />
      </View>

      {/* Body — Photo + Announcement */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 40, paddingVertical: 20, backgroundColor: theme.bodyBg }}>
        <View style={{ width: '38%', alignItems: 'center', paddingRight: 20 }}>
          <PhotoFrame data={data} theme={theme} />
          <AgeBadge age={data.age} theme={theme} />
        </View>
        <View style={{ width: '62%', justifyContent: 'center', paddingLeft: 10 }}>
          <Text style={{ fontFamily: 'EBGaramond', fontSize: 9, lineHeight: 1.5, textAlign: 'justify', color: theme.bodyText }}>
            {data.announcementText || ''}
          </Text>
        </View>
      </View>

      {/* Name Band */}
      <View style={{ paddingVertical: 14, paddingHorizontal: 40, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.accent }}>
        <Text style={{ fontFamily: 'Playfair', fontWeight: 700, fontSize: 20, letterSpacing: 4, textAlign: 'center', textTransform: 'uppercase', color: theme.headerBg }}>
          {data.fullName || 'Full Name'}
        </Text>
        {data.alias ? <Text style={{ fontFamily: 'Cormorant', fontStyle: 'italic', fontSize: 12, textAlign: 'center', marginTop: 2, color: theme.headerBg, opacity: 0.8 }}>({data.alias})</Text> : null}
        <DeathDetails data={data} color={theme.headerBg} />
      </View>

      {/* Details Section */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 40, paddingVertical: 16, flex: 1, backgroundColor: theme.detailsBg }}>
        <View style={{ width: '50%', paddingRight: 20 }}>
          <Text style={{ fontFamily: 'Playfair', fontWeight: 700, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8, color: theme.detailsText }}>FUNERAL ARRANGEMENTS</Text>
          <ArrangementsList data={data} theme={theme} />
          {getHasImmediateFamily(data) ? (
            <>
              <View style={{ height: 0.5, marginVertical: 8, opacity: 0.4, backgroundColor: theme.accent }} />
              <Text style={{ fontFamily: 'Playfair', fontWeight: 700, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8, marginTop: 10, color: theme.detailsText }}>IMMEDIATE FAMILY</Text>
              <ImmediateFamilyFields data={data} theme={theme} />
            </>
          ) : null}
        </View>
        <View style={{ width: '50%', paddingLeft: 20 }}>
          {getHasExtendedFamily(data) ? <ExtendedFamilyFields data={data} theme={theme} /> : null}
        </View>
      </View>

      <FooterBand data={data} theme={theme} />
    </Page>
  )
}

// ─── LAYOUT: Elegant ─────────────────────────────────────────────────────────
// Ornamental border frame, centered photo — burgundyIvory, rosePink

function ElegantLayout({ data, theme }) {
  return (
    <Page size={[A3_WIDTH, A3_HEIGHT]} style={{ fontFamily: 'EBGaramond', fontSize: 9, backgroundColor: theme.detailsBg }}>
      {/* Outer decorative border */}
      <View style={{
        position: 'absolute', top: 16, left: 16, right: 16, bottom: 16,
        borderWidth: 2, borderColor: theme.accent,
      }} />
      <View style={{
        position: 'absolute', top: 22, left: 22, right: 22, bottom: 22,
        borderWidth: 0.5, borderColor: theme.accent, opacity: 0.5,
      }} />
      <View style={{
        position: 'absolute', top: 26, left: 26, right: 26, bottom: 26,
        borderWidth: 1, borderColor: theme.accent,
      }} />

      {/* Header inside frame */}
      <View style={{ paddingTop: 44, paddingBottom: 14, paddingHorizontal: 50, alignItems: 'center', backgroundColor: theme.headerBg, marginTop: 30, marginHorizontal: 30 }}>
        <Text style={{ fontFamily: 'Playfair', fontWeight: 700, fontSize: 22, letterSpacing: 5, textAlign: 'center', textTransform: 'uppercase', color: theme.headerText }}>
          {data.headerTitle || 'CALLED TO GLORY'}
        </Text>
        <GoldDivider color={theme.divider} width="40%" />
      </View>

      {/* Centered photo + name */}
      <View style={{ alignItems: 'center', paddingVertical: 20, paddingHorizontal: 50, backgroundColor: theme.bodyBg, marginHorizontal: 30 }}>
        <PhotoFrame data={data} theme={theme} width={220} height={280} />
        <AgeBadge age={data.age} theme={theme} />

        {/* Name below photo */}
        <View style={{ marginTop: 16, alignItems: 'center' }}>
          <GoldDivider color={theme.divider} width="60%" />
          <Text style={{ fontFamily: 'Playfair', fontWeight: 700, fontSize: 22, letterSpacing: 4, textAlign: 'center', textTransform: 'uppercase', color: theme.accent, marginTop: 10 }}>
            {data.fullName || 'Full Name'}
          </Text>
          {data.alias ? <Text style={{ fontFamily: 'Cormorant', fontStyle: 'italic', fontSize: 13, textAlign: 'center', marginTop: 4, color: theme.bodyText, opacity: 0.8 }}>({data.alias})</Text> : null}
          <DeathDetails data={data} color={theme.bodyText} />
          <View style={{ marginTop: 8 }}><GoldDivider color={theme.divider} width="40%" /></View>
        </View>
      </View>

      {/* Announcement text — centered */}
      <View style={{ paddingHorizontal: 80, paddingVertical: 14, backgroundColor: theme.bodyBg, marginHorizontal: 30 }}>
        <Text style={{ fontFamily: 'EBGaramond', fontSize: 9, lineHeight: 1.6, textAlign: 'center', color: theme.bodyText }}>
          {data.announcementText || ''}
        </Text>
      </View>

      {/* Details — two column */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 50, paddingVertical: 14, flex: 1, backgroundColor: theme.detailsBg, marginHorizontal: 30 }}>
        <View style={{ width: '50%', paddingRight: 16 }}>
          <Text style={{ fontFamily: 'Playfair', fontWeight: 700, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8, color: theme.detailsText }}>FUNERAL ARRANGEMENTS</Text>
          <ArrangementsList data={data} theme={theme} />
          {getHasImmediateFamily(data) ? (
            <>
              <View style={{ height: 0.5, marginVertical: 8, opacity: 0.4, backgroundColor: theme.accent }} />
              <Text style={{ fontFamily: 'Playfair', fontWeight: 700, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8, marginTop: 10, color: theme.detailsText }}>IMMEDIATE FAMILY</Text>
              <ImmediateFamilyFields data={data} theme={theme} />
            </>
          ) : null}
        </View>
        <View style={{ width: '50%', paddingLeft: 16 }}>
          {getHasExtendedFamily(data) ? <ExtendedFamilyFields data={data} theme={theme} /> : null}
        </View>
      </View>

      {/* Footer */}
      <View style={{ paddingVertical: 10, paddingHorizontal: 50, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.footerBg, marginHorizontal: 30, marginBottom: 30 }}>
        <Text style={{ fontFamily: 'EBGaramond', fontSize: 9, textAlign: 'center', letterSpacing: 1, flex: 1, color: theme.headerText }}>{data.invitationText || ''}</Text>
        {data.dressCode ? (
          <View style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 3, marginLeft: 16, backgroundColor: theme.badgeBg }}>
            <Text style={{ fontFamily: 'Playfair', fontWeight: 700, fontSize: 7, letterSpacing: 1, textTransform: 'uppercase', color: theme.badgeText }}>{data.dressCode}</Text>
          </View>
        ) : null}
      </View>
    </Page>
  )
}

// ─── LAYOUT: Heritage ────────────────────────────────────────────────────────
// Full-width photo, bold header, card-grid details — kenteHeritage, chocolateCream

function HeritageLayout({ data, theme }) {
  return (
    <Page size={[A3_WIDTH, A3_HEIGHT]} style={{ fontFamily: 'EBGaramond', fontSize: 9 }}>
      {/* Double header — accent stripe + main */}
      <View style={{ height: 6, backgroundColor: theme.accent }} />
      <View style={{ paddingVertical: 22, paddingHorizontal: 40, alignItems: 'center', backgroundColor: theme.headerBg }}>
        <Text style={{ fontFamily: 'Playfair', fontWeight: 700, fontSize: 26, letterSpacing: 7, textAlign: 'center', textTransform: 'uppercase', color: theme.headerText }}>
          {data.headerTitle || 'CALLED TO GLORY'}
        </Text>
        <GoldDivider color={theme.divider} width="35%" />
      </View>
      <View style={{ height: 3, backgroundColor: theme.accent }} />

      {/* Full-width centered photo */}
      <View style={{ alignItems: 'center', paddingVertical: 24, backgroundColor: theme.bodyBg }}>
        <PhotoFrame data={data} theme={theme} width={280} height={350} borderStyle="accent-line" />
        <AgeBadge age={data.age} theme={theme} />
      </View>

      {/* Name band — bold and wide */}
      <View style={{ paddingVertical: 16, paddingHorizontal: 40, alignItems: 'center', backgroundColor: theme.accent }}>
        <Text style={{ fontFamily: 'Playfair', fontWeight: 700, fontSize: 24, letterSpacing: 5, textAlign: 'center', textTransform: 'uppercase', color: theme.headerBg }}>
          {data.fullName || 'Full Name'}
        </Text>
        {data.alias ? <Text style={{ fontFamily: 'Cormorant', fontStyle: 'italic', fontSize: 14, textAlign: 'center', marginTop: 3, color: theme.headerBg, opacity: 0.85 }}>({data.alias})</Text> : null}
        <DeathDetails data={data} color={theme.headerBg} />
      </View>

      {/* Announcement */}
      <View style={{ paddingHorizontal: 60, paddingVertical: 16, backgroundColor: theme.bodyBg }}>
        <Text style={{ fontFamily: 'EBGaramond', fontSize: 9.5, lineHeight: 1.6, textAlign: 'center', color: theme.bodyText }}>
          {data.announcementText || ''}
        </Text>
      </View>

      {/* Details in card-grid style */}
      <View style={{ paddingHorizontal: 40, paddingVertical: 14, flex: 1, backgroundColor: theme.detailsBg }}>
        {/* Arrangements as 2x2 grid */}
        <Text style={{ fontFamily: 'Playfair', fontWeight: 700, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10, color: theme.detailsText, textAlign: 'center' }}>FUNERAL ARRANGEMENTS</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {data.funeralArrangements && data.funeralArrangements.map((item, idx) => (
            <View key={idx} style={{ width: '50%', paddingHorizontal: 8, paddingVertical: 6 }}>
              <View style={{ borderWidth: 1, borderColor: theme.accent, padding: 10, borderRadius: 2 }}>
                {item.label ? <Text style={{ fontFamily: 'Playfair', fontWeight: 700, fontSize: 7.5, letterSpacing: 1, textTransform: 'uppercase', color: theme.accent }}>{item.label}</Text> : null}
                {item.value ? <Text style={{ fontFamily: 'EBGaramond', fontSize: 8.5, marginTop: 3, lineHeight: 1.4, color: theme.detailsText }}>{item.value}</Text> : null}
              </View>
            </View>
          ))}
        </View>

        {/* Family — two columns below */}
        <View style={{ flexDirection: 'row', marginTop: 10 }}>
          <View style={{ width: '50%', paddingRight: 16 }}>
            {getHasImmediateFamily(data) ? (
              <>
                <Text style={{ fontFamily: 'Playfair', fontWeight: 700, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8, marginTop: 6, color: theme.detailsText }}>IMMEDIATE FAMILY</Text>
                <ImmediateFamilyFields data={data} theme={theme} />
              </>
            ) : null}
          </View>
          <View style={{ width: '50%', paddingLeft: 16 }}>
            {getHasExtendedFamily(data) ? <ExtendedFamilyFields data={data} theme={theme} /> : null}
          </View>
        </View>
      </View>

      {/* Footer with accent stripe */}
      <View style={{ height: 3, backgroundColor: theme.accent }} />
      <FooterBand data={data} theme={theme} />
    </Page>
  )
}

// ─── LAYOUT: Centered ────────────────────────────────────────────────────────
// Everything symmetrical, single-column — purpleMajesty, ivoryClassic

function CenteredLayout({ data, theme }) {
  return (
    <Page size={[A3_WIDTH, A3_HEIGHT]} style={{ fontFamily: 'EBGaramond', fontSize: 9 }}>
      {/* Header */}
      <View style={{ paddingVertical: 20, paddingHorizontal: 40, alignItems: 'center', backgroundColor: theme.headerBg }}>
        <Text style={{ fontFamily: 'Playfair', fontWeight: 700, fontSize: 22, letterSpacing: 5, textAlign: 'center', textTransform: 'uppercase', color: theme.headerText }}>
          {data.headerTitle || 'CALLED TO GLORY'}
        </Text>
        <GoldDivider color={theme.divider} width="45%" />
      </View>

      {/* Centered body — photo + name + announcement stacked */}
      <View style={{ alignItems: 'center', paddingVertical: 24, paddingHorizontal: 60, backgroundColor: theme.bodyBg }}>
        <PhotoFrame data={data} theme={theme} width={230} height={290} />
        <AgeBadge age={data.age} theme={theme} />

        {/* Name directly below photo */}
        <Text style={{ fontFamily: 'Playfair', fontWeight: 700, fontSize: 22, letterSpacing: 4, textAlign: 'center', textTransform: 'uppercase', color: theme.accent, marginTop: 16 }}>
          {data.fullName || 'Full Name'}
        </Text>
        {data.alias ? <Text style={{ fontFamily: 'Cormorant', fontStyle: 'italic', fontSize: 13, textAlign: 'center', marginTop: 3, color: theme.bodyText, opacity: 0.8 }}>({data.alias})</Text> : null}
        <DeathDetails data={data} color={theme.bodyText} />

        <View style={{ marginTop: 12 }}><GoldDivider color={theme.divider} width="50%" /></View>

        {/* Announcement centered */}
        <Text style={{ fontFamily: 'EBGaramond', fontSize: 9, lineHeight: 1.6, textAlign: 'center', color: theme.bodyText, marginTop: 14, paddingHorizontal: 40 }}>
          {data.announcementText || ''}
        </Text>
      </View>

      {/* Accent divider strip */}
      <View style={{ height: 4, backgroundColor: theme.accent }} />

      {/* Single-column centered details */}
      <View style={{ paddingHorizontal: 80, paddingVertical: 16, flex: 1, backgroundColor: theme.detailsBg }}>
        <Text style={{ fontFamily: 'Playfair', fontWeight: 700, fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10, color: theme.detailsText, textAlign: 'center' }}>FUNERAL ARRANGEMENTS</Text>

        {/* Arrangements in centered list */}
        <View style={{ alignItems: 'center' }}>
          {data.funeralArrangements && data.funeralArrangements.map((item, idx) => (
            <View key={idx} style={{ marginBottom: 6, alignItems: 'center' }}>
              {item.label ? <Text style={{ fontFamily: 'Playfair', fontWeight: 700, fontSize: 8, letterSpacing: 1, textTransform: 'uppercase', color: theme.detailsText, textAlign: 'center' }}>{item.label}</Text> : null}
              {item.value ? <Text style={{ fontFamily: 'EBGaramond', fontSize: 8.5, marginTop: 1, lineHeight: 1.4, color: theme.detailsText, textAlign: 'center' }}>{item.value}</Text> : null}
            </View>
          ))}
        </View>

        {/* Family — two columns for density */}
        <View style={{ flexDirection: 'row', marginTop: 12 }}>
          <View style={{ width: '50%', paddingRight: 16 }}>
            {getHasImmediateFamily(data) ? (
              <>
                <View style={{ height: 0.5, marginVertical: 8, opacity: 0.4, backgroundColor: theme.accent }} />
                <Text style={{ fontFamily: 'Playfair', fontWeight: 700, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8, color: theme.detailsText, textAlign: 'center' }}>IMMEDIATE FAMILY</Text>
                <ImmediateFamilyFields data={data} theme={theme} />
              </>
            ) : null}
          </View>
          <View style={{ width: '50%', paddingLeft: 16 }}>
            {getHasExtendedFamily(data) ? (
              <>
                <View style={{ height: 0.5, marginVertical: 8, opacity: 0.4, backgroundColor: theme.accent }} />
                <ExtendedFamilyFields data={data} theme={theme} />
              </>
            ) : null}
          </View>
        </View>
      </View>

      <FooterBand data={data} theme={theme} />
    </Page>
  )
}

// ─── LAYOUT: Modern ──────────────────────────────────────────────────────────
// Reversed: text left, photo right, card-block details — forestGreen, oceanNavy, oliveGold

function ModernLayout({ data, theme }) {
  return (
    <Page size={[A3_WIDTH, A3_HEIGHT]} style={{ fontFamily: 'EBGaramond', fontSize: 9 }}>
      {/* Header with left-aligned accent bar */}
      <View style={{ flexDirection: 'row', backgroundColor: theme.headerBg }}>
        <View style={{ width: 6, backgroundColor: theme.accent }} />
        <View style={{ flex: 1, paddingVertical: 18, paddingHorizontal: 36, alignItems: 'center' }}>
          <Text style={{ fontFamily: 'Playfair', fontWeight: 700, fontSize: 22, letterSpacing: 5, textAlign: 'center', textTransform: 'uppercase', color: theme.headerText }}>
            {data.headerTitle || 'CALLED TO GLORY'}
          </Text>
          <GoldDivider color={theme.divider} width="40%" />
        </View>
        <View style={{ width: 6, backgroundColor: theme.accent }} />
      </View>

      {/* Body — Text LEFT, Photo RIGHT (reversed) */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 40, paddingVertical: 20, backgroundColor: theme.bodyBg }}>
        {/* Left: Name + Announcement */}
        <View style={{ width: '55%', justifyContent: 'center', paddingRight: 24 }}>
          <Text style={{ fontFamily: 'Playfair', fontWeight: 700, fontSize: 20, letterSpacing: 3, textTransform: 'uppercase', color: theme.accent, marginBottom: 4 }}>
            {data.fullName || 'Full Name'}
          </Text>
          {data.alias ? <Text style={{ fontFamily: 'Cormorant', fontStyle: 'italic', fontSize: 12, color: theme.bodyText, opacity: 0.8, marginBottom: 4 }}>({data.alias})</Text> : null}
          <DeathDetails data={data} color={theme.bodyText} />
          <View style={{ height: 1, backgroundColor: theme.accent, marginVertical: 12, width: '40%' }} />
          <Text style={{ fontFamily: 'EBGaramond', fontSize: 9, lineHeight: 1.5, textAlign: 'justify', color: theme.bodyText }}>
            {data.announcementText || ''}
          </Text>
        </View>

        {/* Right: Photo */}
        <View style={{ width: '45%', alignItems: 'center' }}>
          <PhotoFrame data={data} theme={theme} width={260} height={325} borderStyle="accent-line" />
          <AgeBadge age={data.age} theme={theme} />
        </View>
      </View>

      {/* Name accent strip (thinner, used as separator) */}
      <View style={{ height: 5, backgroundColor: theme.accent }} />

      {/* Details in card blocks with accent left-border */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 40, paddingVertical: 14, flex: 1, backgroundColor: theme.detailsBg }}>
        <View style={{ width: '50%', paddingRight: 16 }}>
          <Text style={{ fontFamily: 'Playfair', fontWeight: 700, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8, color: theme.detailsText }}>FUNERAL ARRANGEMENTS</Text>
          {data.funeralArrangements && data.funeralArrangements.map((item, idx) => (
            <View key={idx} style={{ marginBottom: 6, paddingLeft: 10, borderLeftWidth: 2, borderLeftColor: theme.accent }}>
              {item.label ? <Text style={{ fontFamily: 'Playfair', fontWeight: 700, fontSize: 8, letterSpacing: 1, textTransform: 'uppercase', color: theme.detailsText }}>{item.label}</Text> : null}
              {item.value ? <Text style={{ fontFamily: 'EBGaramond', fontSize: 8.5, marginTop: 1, lineHeight: 1.4, color: theme.detailsText }}>{item.value}</Text> : null}
            </View>
          ))}
          {getHasImmediateFamily(data) ? (
            <>
              <View style={{ height: 0.5, marginVertical: 8, opacity: 0.4, backgroundColor: theme.accent }} />
              <Text style={{ fontFamily: 'Playfair', fontWeight: 700, fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8, marginTop: 10, color: theme.detailsText }}>IMMEDIATE FAMILY</Text>
              <ImmediateFamilyFields data={data} theme={theme} />
            </>
          ) : null}
        </View>
        <View style={{ width: '50%', paddingLeft: 16 }}>
          {getHasExtendedFamily(data) ? <ExtendedFamilyFields data={data} theme={theme} /> : null}
        </View>
      </View>

      {/* Footer with accent bars */}
      <View style={{ flexDirection: 'row', backgroundColor: theme.footerBg }}>
        <View style={{ width: 6, backgroundColor: theme.accent }} />
        <View style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: 'EBGaramond', fontSize: 9, textAlign: 'center', letterSpacing: 1, flex: 1, color: theme.headerText }}>{data.invitationText || ''}</Text>
          {data.dressCode ? (
            <View style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 3, marginLeft: 16, backgroundColor: theme.badgeBg }}>
              <Text style={{ fontFamily: 'Playfair', fontWeight: 700, fontSize: 7, letterSpacing: 1, textTransform: 'uppercase', color: theme.badgeText }}>{data.dressCode}</Text>
            </View>
          ) : null}
        </View>
        <View style={{ width: 6, backgroundColor: theme.accent }} />
      </View>
    </Page>
  )
}

// ─── Main export ─────────────────────────────────────────────────────────────

export default function PosterDocument({ data }) {
  const theme = getPosterTheme(data.posterTheme)
  const layout = theme.layout || 'classic'

  return (
    <Document>
      {layout === 'elegant' && <ElegantLayout data={data} theme={theme} />}
      {layout === 'heritage' && <HeritageLayout data={data} theme={theme} />}
      {layout === 'centered' && <CenteredLayout data={data} theme={theme} />}
      {layout === 'modern' && <ModernLayout data={data} theme={theme} />}
      {layout === 'classic' && <ClassicLayout data={data} theme={theme} />}
    </Document>
  )
}
