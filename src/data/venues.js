const venues = [
  // ACCRA - Churches
  {
    id: 1,
    name: 'Holy Spirit Cathedral',
    type: 'church',
    city: 'Accra',
    region: 'Greater Accra',
    address: 'Adabraka, Near Rawlings Park, Accra',
    phone: '+233 302 222 728',
    description: 'The seat of the Catholic Archdiocese of Accra. A grand cathedral frequently used for large funeral masses and memorial services in the heart of the capital.'
  },
  {
    id: 2,
    name: 'Christ the King Catholic Church',
    type: 'church',
    city: 'Accra',
    region: 'Greater Accra',
    address: 'Cantonments, Accra',
    phone: '+233 302 776 099',
    description: 'One of the most prestigious Catholic parishes in Accra, known for hosting dignified funeral services for prominent families in the Cantonments area.'
  },
  {
    id: 3,
    name: 'Ridge Church (Ebenezer Presbyterian Church)',
    type: 'church',
    city: 'Accra',
    region: 'Greater Accra',
    address: 'Castle Road, Ridge, Accra',
    phone: '+233 302 221 445',
    description: 'A historic Presbyterian church on Ridge, one of the oldest congregations in Ghana. A popular venue for solemn funeral and thanksgiving services.'
  },
  {
    id: 4,
    name: 'Wesley Methodist Cathedral',
    type: 'church',
    city: 'Accra',
    region: 'Greater Accra',
    address: 'Derby Avenue, Accra Central',
    phone: '+233 302 662 020',
    description: 'The principal Methodist cathedral in Accra, located in the central business district. Hosts many state and high-profile funeral services.'
  },
  {
    id: 5,
    name: 'Accra Ridge Church (Anglican)',
    type: 'church',
    city: 'Accra',
    region: 'Greater Accra',
    address: '2nd Circular Road, Cantonments, Accra',
    phone: '+233 302 773 902',
    description: 'A prominent Anglican parish in the Ridge-Cantonments area known for formal and well-organized funeral liturgies.'
  },
  {
    id: 6,
    name: 'Lighthouse Chapel International (Head Office)',
    type: 'church',
    city: 'Accra',
    region: 'Greater Accra',
    address: 'Korle Bu, Accra',
    phone: null,
    description: 'Headquarters of the Lighthouse Chapel denomination. A large auditorium used for funeral and memorial services with modern facilities.'
  },
  // ACCRA - Mortuaries
  {
    id: 7,
    name: 'Korle Bu Teaching Hospital Mortuary',
    type: 'mortuary',
    city: 'Accra',
    region: 'Greater Accra',
    address: 'Korle Bu, Accra',
    phone: '+233 302 665 401',
    description: 'The largest hospital mortuary in Ghana, located at the Korle Bu Teaching Hospital. Provides body preservation and preparation services for funerals across the Greater Accra region.'
  },
  {
    id: 8,
    name: '37 Military Hospital Mortuary',
    type: 'mortuary',
    city: 'Accra',
    region: 'Greater Accra',
    address: 'Liberation Road, Accra',
    phone: '+233 302 776 111',
    description: 'Military hospital mortuary serving both military personnel and civilians. Known for well-maintained facilities and professional care.'
  },
  {
    id: 9,
    name: 'Transition Home Funeral Services',
    type: 'mortuary',
    city: 'Accra',
    region: 'Greater Accra',
    address: 'Haatso, Accra',
    phone: '+233 244 000 111',
    description: 'A modern private funeral home offering mortuary services, body preparation, embalming, and funeral coordination in the Accra metropolitan area.'
  },
  {
    id: 10,
    name: 'Ridge Hospital Mortuary',
    type: 'mortuary',
    city: 'Accra',
    region: 'Greater Accra',
    address: 'Castle Road, Ridge, Accra',
    phone: '+233 302 228 315',
    description: 'Mortuary facility at the Greater Accra Regional Hospital (Ridge Hospital), serving the Ridge and surrounding communities.'
  },
  // ACCRA - Funeral Grounds
  {
    id: 11,
    name: 'Forecourt of the State House',
    type: 'funeral_grounds',
    city: 'Accra',
    region: 'Greater Accra',
    address: 'Gamel Abdul Nasser Avenue, Accra',
    phone: null,
    description: 'The forecourt of the State House (Flagstaff House) is used for state funerals and memorial services for former heads of state and distinguished national figures.'
  },
  {
    id: 12,
    name: 'Independence Square (Black Star Square)',
    type: 'funeral_grounds',
    city: 'Accra',
    region: 'Greater Accra',
    address: 'Independence Avenue, Accra',
    phone: null,
    description: 'Ghana\'s largest public square, used for major state funerals and national memorial ceremonies. Can accommodate tens of thousands of mourners.'
  },
  {
    id: 13,
    name: 'Accra International Conference Centre',
    type: 'community_center',
    city: 'Accra',
    region: 'Greater Accra',
    address: 'Castle Road, Ridge, Accra',
    phone: '+233 302 669 600',
    description: 'A large multipurpose venue used for high-profile funerals, memorial services, and thanksgiving ceremonies with modern audio-visual facilities.'
  },
  {
    id: 14,
    name: 'La Palm Royal Beach Hotel Grounds',
    type: 'funeral_grounds',
    city: 'Accra',
    region: 'Greater Accra',
    address: 'La, Accra',
    phone: '+233 302 771 700',
    description: 'Beachfront hotel grounds occasionally used for upscale funeral receptions and after-burial thanksgiving gatherings.'
  },
  // TEMA
  {
    id: 15,
    name: 'Tema General Hospital Mortuary',
    type: 'mortuary',
    city: 'Tema',
    region: 'Greater Accra',
    address: 'Tema General Hospital, Community 1, Tema',
    phone: '+233 303 212 020',
    description: 'The main public hospital mortuary in the Tema metropolis, serving the industrial city and surrounding communities.'
  },
  {
    id: 16,
    name: 'Tema Community 1 Methodist Church',
    type: 'church',
    city: 'Tema',
    region: 'Greater Accra',
    address: 'Community 1, Tema',
    phone: null,
    description: 'A well-established Methodist church in Tema, frequently hosting funeral services for the Community 1 area and beyond.'
  },
  {
    id: 17,
    name: 'Tema Manhean Community Centre',
    type: 'community_center',
    city: 'Tema',
    region: 'Greater Accra',
    address: 'Tema Manhean, Tema',
    phone: null,
    description: 'A popular community centre used by local families for funeral gatherings, wake-keepings, and thanksgiving events in the Tema traditional area.'
  },
  // KUMASI
  {
    id: 18,
    name: 'Calvary Methodist Church',
    type: 'church',
    city: 'Kumasi',
    region: 'Ashanti',
    address: 'Adum, Kumasi',
    phone: null,
    description: 'A prominent Methodist church in the heart of Kumasi\'s commercial district. One of the most sought-after venues for Ashanti funeral services.'
  },
  {
    id: 19,
    name: 'St. Cyprian\'s Anglican Church',
    type: 'church',
    city: 'Kumasi',
    region: 'Ashanti',
    address: 'Bantama, Kumasi',
    phone: null,
    description: 'A historic Anglican parish in Kumasi, known for dignified funeral liturgies and serving the Bantama royal area.'
  },
  {
    id: 20,
    name: 'Komfo Anokye Teaching Hospital Mortuary',
    type: 'mortuary',
    city: 'Kumasi',
    region: 'Ashanti',
    address: 'Bantama, Kumasi',
    phone: '+233 322 022 301',
    description: 'The principal teaching hospital mortuary in the Ashanti Region. One of the largest mortuaries in northern Ghana, serving Kumasi and surrounding regions.'
  },
  {
    id: 21,
    name: 'Wesley Methodist Church Kumasi',
    type: 'church',
    city: 'Kumasi',
    region: 'Ashanti',
    address: 'Adum, Kumasi',
    phone: null,
    description: 'A major Methodist church in Kumasi\'s Adum area, known for its long tradition of hosting Ashanti funeral and memorial services.'
  },
  {
    id: 22,
    name: 'Kumasi Cultural Centre',
    type: 'community_center',
    city: 'Kumasi',
    region: 'Ashanti',
    address: 'National Cultural Centre, Bantama Road, Kumasi',
    phone: '+233 322 024 816',
    description: 'The Kumasi Centre for National Culture offers grounds and halls used for large funeral gatherings, particularly for prominent Ashanti families.'
  },
  {
    id: 23,
    name: 'Manhyia Palace Grounds',
    type: 'funeral_grounds',
    city: 'Kumasi',
    region: 'Ashanti',
    address: 'Manhyia, Kumasi',
    phone: null,
    description: 'The grounds of the Asantehene\'s palace, used for royal and high-profile Ashanti funerals and traditional funeral rites.'
  },
  // TAKORADI
  {
    id: 24,
    name: 'St. Anthony Catholic Cathedral',
    type: 'church',
    city: 'Takoradi',
    region: 'Western',
    address: 'Chapel Hill, Takoradi',
    phone: null,
    description: 'The Catholic cathedral of the Sekondi-Takoradi archdiocese, a major venue for funeral masses in the Western Region.'
  },
  {
    id: 25,
    name: 'Effia Nkwanta Regional Hospital Mortuary',
    type: 'mortuary',
    city: 'Takoradi',
    region: 'Western',
    address: 'Effia Nkwanta, Sekondi-Takoradi',
    phone: '+233 312 046 228',
    description: 'The main regional hospital mortuary in the Western Region, serving Sekondi-Takoradi and surrounding communities.'
  },
  {
    id: 26,
    name: 'Takoradi Wesley Methodist Church',
    type: 'church',
    city: 'Takoradi',
    region: 'Western',
    address: 'Market Circle, Takoradi',
    phone: null,
    description: 'A historic Methodist church near the Takoradi market area, regularly used for funeral and memorial services in the twin city.'
  },
  // CAPE COAST
  {
    id: 27,
    name: 'Christ Church Anglican Cathedral',
    type: 'church',
    city: 'Cape Coast',
    region: 'Central',
    address: 'Victoria Road, Cape Coast',
    phone: null,
    description: 'A historic Anglican cathedral in Cape Coast, one of the oldest churches in Ghana. A revered venue for funeral services in the Central Region.'
  },
  {
    id: 28,
    name: 'Cape Coast Teaching Hospital Mortuary',
    type: 'mortuary',
    city: 'Cape Coast',
    region: 'Central',
    address: 'University Post Office Road, Cape Coast',
    phone: '+233 332 132 040',
    description: 'The main teaching hospital mortuary in the Central Region, providing mortuary services for Cape Coast and surrounding districts.'
  },
  {
    id: 29,
    name: 'Wesley Methodist Church Cape Coast',
    type: 'church',
    city: 'Cape Coast',
    region: 'Central',
    address: 'Commercial Street, Cape Coast',
    phone: null,
    description: 'One of the earliest Methodist churches established in the Gold Coast. A significant venue for traditional funeral and memorial services in Cape Coast.'
  },
  // TAMALE
  {
    id: 30,
    name: 'Tamale Teaching Hospital Mortuary',
    type: 'mortuary',
    city: 'Tamale',
    region: 'Northern',
    address: 'Tamale Teaching Hospital, Tamale',
    phone: '+233 372 022 455',
    description: 'The principal hospital mortuary in northern Ghana, serving the Tamale metropolis and communities across the Northern, Savannah, and North East regions.'
  },
  {
    id: 31,
    name: 'Our Lady of Annunciation Catholic Cathedral',
    type: 'church',
    city: 'Tamale',
    region: 'Northern',
    address: 'Cathedral Road, Tamale',
    phone: null,
    description: 'The Catholic cathedral of the Tamale archdiocese. A principal church venue for funeral masses in the Northern Region.'
  },
  {
    id: 32,
    name: 'Tamale Central Mosque Grounds',
    type: 'funeral_grounds',
    city: 'Tamale',
    region: 'Northern',
    address: 'Central Tamale',
    phone: null,
    description: 'Open grounds near the Tamale Central Mosque used for Islamic funeral prayers (Janazah) and burial rites in the predominantly Muslim northern city.'
  },
  {
    id: 33,
    name: 'GNAT Hall Tamale',
    type: 'community_center',
    city: 'Tamale',
    region: 'Northern',
    address: 'GNAT Avenue, Tamale',
    phone: null,
    description: 'Ghana National Association of Teachers hall in Tamale, used for funeral gatherings, wake-keepings, and community memorial events.'
  }
]

export default venues
