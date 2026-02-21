import { Page, View, Text, Image } from '@react-pdf/renderer'
import { PageBorders, OrnamentalDivider, CrossSymbol, TripleDot } from './decorations'
import { createStyles } from './styles'
import { getYear } from '../../utils/formatDate'

export default function BackCoverPage({ data, theme }) {
  const s = createStyles(theme)

  return (
    <Page size="A4" style={s.page}>
      <PageBorders theme={theme} />
      <View style={s.content}>
        <View style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <CrossSymbol theme={theme} size={24} style={{ marginBottom: 10 }} />

          {data.backCoverSubtext && (
            <Text style={{
              fontFamily: 'Playfair', fontWeight: 700, fontSize: 16,
              color: theme.heading, textAlign: 'center',
              letterSpacing: 4, textTransform: 'uppercase',
            }}>
              {data.backCoverSubtext}
            </Text>
          )}

          <TripleDot theme={theme} style={{ marginVertical: 10 }} />

          {/* Small portrait */}
          <View style={{
            width: 140, height: 170, borderRadius: 70,
            overflow: 'hidden', marginVertical: 12,
            borderWidth: 2, borderColor: theme.border, borderStyle: 'solid',
          }}>
            {(data.backCoverPhoto || data.coverPhoto) ? (
              <Image src={data.backCoverPhoto || data.coverPhoto} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
            ) : (
              <View style={[s.photoPlaceholder, { width: '100%', height: '100%', borderWidth: 0.01, borderRadius: 0.01 }]}>
                <CrossSymbol theme={theme} size={24} />
              </View>
            )}
          </View>

          {/* Name */}
          <Text style={{
            fontFamily: 'Playfair', fontWeight: 700, fontSize: 14,
            color: theme.heading, textAlign: 'center',
            letterSpacing: 3, textTransform: 'uppercase', lineHeight: 1.5,
          }}>
            {data.title} {data.fullName}
          </Text>

          {/* Years */}
          <Text style={{
            fontFamily: 'Cormorant', fontSize: 13,
            color: theme.subtleText, textAlign: 'center',
            letterSpacing: 3, marginTop: 4,
          }}>
            {getYear(data.dateOfBirth)} — {getYear(data.dateOfDeath)}
          </Text>

          <OrnamentalDivider theme={theme} width={140} style={{ marginVertical: 14 }} />

          {/* Verse */}
          {data.backCoverVerse && (
            <Text style={[s.verseText, { fontSize: 10, maxWidth: 340 }]}>
              {data.backCoverVerse}
            </Text>
          )}

          <TripleDot theme={theme} style={{ marginVertical: 10 }} />

          {/* Closing phrase */}
          {data.backCoverPhrase && (
            <Text style={{
              fontFamily: 'Playfair', fontWeight: 700, fontSize: 18,
              color: theme.heading, textAlign: 'center',
              letterSpacing: 4, marginTop: 4,
            }}>
              {data.backCoverPhrase}
            </Text>
          )}

          {data.designerCredit && (
            <Text style={{
              fontFamily: 'Cormorant', fontSize: 7,
              color: theme.subtleText, textAlign: 'center',
              opacity: 0.5, marginTop: 20, letterSpacing: 1,
            }}>
              {data.designerCredit}
            </Text>
          )}

          {data.memorialQrCode && (
            <View style={{ alignItems: 'center', marginTop: 15 }}>
              <Image
                src={data.memorialQrCode}
                style={{ width: 60, height: 60 }}
              />
              <Text style={{
                fontFamily: 'Cormorant', fontSize: 6,
                color: theme.subtleText, textAlign: 'center',
                marginTop: 4, letterSpacing: 0.5,
              }}>
                Scan for Online Memorial
              </Text>
            </View>
          )}
        </View>
      </View>
    </Page>
  )
}
