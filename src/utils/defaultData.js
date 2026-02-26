export const defaultScriptures = {
  'psalm23': {
    title: 'PSALM 23',
    subtitle: 'The Lord is My Shepherd',
    text: `The Lord is my shepherd; I shall not want.\n\nHe maketh me to lie down in green pastures: He leadeth me beside the still waters.\n\nHe restoreth my soul: He leadeth me in the paths of righteousness for His name's sake.\n\nYea, though I walk through the valley of the shadow of death, I will fear no evil: for Thou art with me; Thy rod and Thy staff they comfort me.\n\nThou preparest a table before me in the presence of mine enemies: Thou anointest my head with oil; my cup runneth over.\n\nSurely goodness and mercy shall follow me all the days of my life: and I will dwell in the house of the Lord for ever.`,
  },
  'psalm91': {
    title: 'PSALM 91',
    subtitle: 'Under His Wings',
    text: `He that dwelleth in the secret place of the most High shall abide under the shadow of the Almighty.\n\nI will say of the Lord, He is my refuge and my fortress: my God; in Him will I trust.\n\nSurely He shall deliver thee from the snare of the fowler, and from the noisome pestilence.\n\nHe shall cover thee with His feathers, and under His wings shalt thou trust: His truth shall be thy shield and buckler.`,
  },
  'john14': {
    title: 'JOHN 14:1-6',
    subtitle: 'In My Father\'s House',
    text: `Let not your hearts be troubled. Believe in God; believe also in me.\n\nIn my Father's house are many rooms. If it were not so, would I have told you that I go to prepare a place for you?\n\nAnd if I go and prepare a place for you, I will come again and will take you to myself, that where I am you may be also.\n\nAnd you know the way to where I am going.\n\nThomas said to him, "Lord, we do not know where you are going. How can we know the way?"\n\nJesus said to him, "I am the way, and the truth, and the life. No one comes to the Father except through me."`,
  },
  'revelation21': {
    title: 'REVELATION 21:4',
    subtitle: 'No More Tears',
    text: `And God shall wipe away all tears from their eyes; and there shall be no more death, neither sorrow, nor crying, neither shall there be any more pain: for the former things are passed away.\n\nAnd He that sat upon the throne said, Behold, I make all things new.`,
  },
  'ecclesiastes3': {
    title: 'ECCLESIASTES 3:1-8',
    subtitle: 'A Time for Everything',
    text: `To every thing there is a season, and a time to every purpose under the heaven:\n\nA time to be born, and a time to die; a time to plant, and a time to pluck up that which is planted;\n\nA time to kill, and a time to heal; a time to break down, and a time to build up;\n\nA time to weep, and a time to laugh; a time to mourn, and a time to dance;\n\nA time to cast away stones, and a time to gather stones together; a time to embrace, and a time to refrain from embracing;\n\nA time to get, and a time to lose; a time to keep, and a time to cast away;\n\nA time to rend, and a time to sew; a time to keep silence, and a time to speak;\n\nA time to love, and a time to hate; a time of war, and a time of peace.`,
  },
}

export const defaultOrderOfService = {
  churchService: [
    { time: '8:30 AM', description: 'Congregation Pays Last Respect' },
    { time: '8:40 AM', description: 'Officiating Ministers Enter, File Past the Corpse and Take Their Seats' },
    { time: '8:45 AM', description: 'Coffin is Closed Permanently' },
    { time: '8:50 AM', description: 'Congregation Stands' },
    { time: '8:50 AM', description: 'Hymn I — Lead Us Heavenly Father' },
    { time: '8:55 AM', description: 'Invocation / Opening Prayer' },
    { time: '9:00 AM', description: 'Scripture Reading I (Revelation 14:12,13)' },
    { time: '9:05 AM', description: 'Scripture Reading II (Revelation 20:11-15)' },
    { time: '9:10 AM', description: 'Hymn II — When I Survey' },
    { time: '9:15 AM', description: 'Biography' },
    { time: '9:30 AM', description: 'Tributes I – III' },
    { time: '10:15 AM', description: 'Song I — Special Ministration' },
    { time: '10:30 AM', description: 'Offertory for Family — Song II (Special Ministration)' },
    { time: '10:40 AM', description: 'Sermon' },
    { time: '10:50 AM', description: 'Altar Call / Closing Prayer' },
    { time: '10:55 AM', description: 'Song III' },
    { time: '11:00 AM', description: 'The Benediction' },
  ],
  privateBurial: [
    { time: '11:45 AM', description: 'Delegation Departs with Body to Anloga' },
    { time: '', description: 'Reception by Family Elders' },
    { time: '', description: 'Traditional Rites & Customs' },
    { time: '', description: 'Scripture Reading' },
    { time: '', description: 'Prayer of Committal' },
    { time: '', description: 'Lowering of Casket' },
    { time: '', description: 'Final Prayers & Benediction' },
    { time: '', description: 'Wreath Laying' },
  ],
}

export const defaultTributes = [
  {
    id: 'trib-children',
    title: 'Tribute by the Children',
    subtitle: 'To Our Beloved Mother',
    openingVerse: '"Her children arise and call her blessed."\n— Proverbs 31:28',
    body: 'Mama, you were our first teacher, our fiercest protector, and our greatest cheerleader. From our earliest memories, you shaped every good thing in us with your love, discipline, and unwavering faith.\n\nYou taught us the value of integrity through your decades of dedicated service, where you earned the respect and admiration of all who knew you. Your kitchen was always warm, your door always open, and your heart always full of love.\n\nWe are who we are because of you, Mama. The lessons you taught us, the prayers you whispered over us, and the countless sacrifices you made will forever be the foundation of our lives.\n\nRest well, our beloved mother. Until we meet again at the feet of Jesus.',
    closingLine: 'Rest in Perfect Peace, Mama',
    photos: [null, null, null],
    photoCaptions: ['', '', ''],
  },
  {
    id: 'trib-grandchildren',
    title: 'Tribute by the Grandchildren',
    subtitle: 'Our Beloved Grandmother',
    openingVerse: '"Grandchildren are the crown of the aged."\n— Proverbs 17:6',
    body: 'Grandma, you were the warmest embrace, the sweetest smile, and the wisest voice in our lives. Your stories painted vivid pictures of a world we could only imagine — of community, of faith, and of love.\n\nYou had a way of making every grandchild feel like the most special person in the world. Your faith was not just something you spoke about — it was something you lived and breathed in everything you did.\n\nWe will carry your legacy in our hearts always — your grace, your faith, your kindness, and your boundless love.\n\nRest in perfect peace, Grandma. We love you beyond words.',
    closingLine: 'Forever in Our Hearts',
    photos: [null, null, null],
    photoCaptions: ['', '', ''],
  },
  {
    id: 'trib-family',
    title: 'Tribute by the Family',
    subtitle: 'A Pillar of Our Family',
    openingVerse: '"A woman who fears the Lord is to be praised."\n— Proverbs 31:30',
    body: 'She was the embodiment of what it means to be family. Rooted in rich traditions, she carried within her the warmth, wisdom, and strength of generations.\n\nWhether it was hosting family gatherings with lavish hospitality, mediating family matters with grace and wisdom, or simply being present with a listening ear, she was always there. Her home was a sanctuary for all.\n\nThe family has lost a great matriarch, but her spirit lives on in every lesson she taught, every life she touched, and every heart she warmed.',
    closingLine: 'Damirifa Due — Rest Well',
    photos: [null, null, null],
    photoCaptions: ['', '', ''],
  },
  {
    id: 'trib-friends',
    title: 'Tribute by Friends',
    subtitle: 'A True & Faithful Friend',
    openingVerse: '"A friend loves at all times."\n— Proverbs 17:17',
    body: 'To know her was to know what true friendship meant. She had a rare and beautiful gift for making everyone feel valued, seen, and heard.\n\nThrough the decades, she remained constant — loyal, caring, and always ready with wise counsel. Her generosity knew no bounds, and she gave freely without expectation.\n\nWe will miss her laughter, her wisdom, and the quiet strength she brought to every gathering. Farewell, dear friend.',
    closingLine: 'Until We Meet Again',
    photos: [null, null, null],
    photoCaptions: ['', '', ''],
  },
  {
    id: 'trib-colleagues',
    title: 'Tribute by Colleagues',
    subtitle: 'A Shining Star Among Us',
    openingVerse: '"Well done, good and faithful servant."\n— Matthew 25:21',
    body: 'She was more than a colleague — she was the heartbeat of our workplace. From her very first day, she set a standard of excellence that inspired all who had the privilege of working alongside her.\n\nHer dedication to duty was unmatched. She approached every task with meticulous attention to detail and unwavering commitment. Even after retirement, she remained a beloved member of our family.\n\nWe have lost a shining star from our midst. May she rest in eternal peace.',
    closingLine: 'Rest in Eternal Peace',
    photos: [null, null, null],
    photoCaptions: ['', '', ''],
  },
]

export const defaultBiography = `She was born into a loving family and grew up surrounded by faith, community, and the values that would guide her throughout her remarkable life.

From an early age, she demonstrated exceptional promise — a bright, curious mind coupled with a warm and generous spirit. Her education laid the foundation for a life of achievement and service.

She embarked on a distinguished professional career that spanned decades, earning the deep respect and admiration of colleagues and clients alike. She was known for her integrity, her warm manner, and her unwavering commitment to excellence.

Beyond her professional achievements, she was first and foremost a woman of deep faith and a devoted mother. She raised her children with immense love, firm discipline, and an unwavering belief in the power of education and hard work.

As a grandmother, she found renewed joy and purpose, showering her grandchildren with boundless love and wisdom, ensuring that family values and traditions would be passed on to the next generation.

She lived a life of purpose, dignity, and extraordinary grace. She touched countless lives through her warmth, generosity, and quiet strength. Her legacy of love, faith, and excellence will endure through the generations she so lovingly nurtured.`

export const defaultAcknowledgements = `The family wishes to express our heartfelt and deepest gratitude to all who have supported us during this time of bereavement. Your prayers, visits, phone calls, and messages of condolence have been a source of immense comfort and strength.

We are especially grateful to the Clergy and Church family for their spiritual guidance, the medical team for their dedicated care, and all family, friends, colleagues, and well-wishers near and far who have stood with us during this difficult season.

May the good Lord richly bless you all for your love, kindness, and generosity.`

export const defaultData = {
  title: 'Mrs.',
  fullName: 'Josephine Worla Ameovi-Hodges',
  dateOfBirth: '1948-07-15',
  dateOfDeath: '2025-12-14',
  funeralDate: '2026-02-28',
  funeralTime: '08:30',
  funeralVenue: '37 Military Hospital Methodist-Presbyterian Church',
  burialLocation: 'Anloga, Volta Region',
  theme: 'blackGold',
  coverPhoto: null,
  coverVerse: '"Blessed are the dead who die in the Lord from henceforth: Yea, saith the Spirit, that they may rest from their labours; and their works do follow them."\n— Revelation 14:13',
  coverSubtitle: 'Celebration of Life',
  scriptureKey: 'psalm23',
  customScripture: '',
  additionalVerse: '"For I am persuaded, that neither death, nor life, nor angels, nor principalities, nor powers, nor things present, nor things to come, nor height, nor depth, nor any other creature, shall be able to separate us from the love of God, which is in Christ Jesus our Lord."\n— Romans 8:38-39',
  officials: {
    ministers: [
      { role: 'Officiating Minister', name: '' },
    ],
    programmeOfficials: [
      { role: 'Master of Ceremonies', name: '' },
    ],
    flowerBearers: '',
    pallBearers: '',
  },
  orderOfService: defaultOrderOfService,
  biography: defaultBiography,
  biographyPhotos: [null, null, null],
  biographyPhotoCaptions: ['', '', ''],
  tributes: defaultTributes,
  galleryPhotos: Array(8).fill(null).map((_, i) => ({
    id: `photo-${i}`,
    src: null,
    caption: '',
    pageTitle: i < 4 ? 'Treasured Memories' : 'A Life Well Lived',
  })),
  acknowledgements: defaultAcknowledgements,
  familySignature: 'The Family',
  backCoverVerse: '"I have fought the good fight, I have finished the race, I have kept the faith. Henceforth there is laid up for me the crown of righteousness, which the Lord, the righteous judge, will award to me on that day."\n— 2 Timothy 4:7-8',
  backCoverPhoto: null,
  backCoverPhrase: 'DAMIRIFA DUE!',
  backCoverSubtext: 'Rest in Perfect Peace',
  designerCredit: '',
  memorialId: null,
  memorialQrCode: null,
  liveServiceId: null,
  liveServiceQrCode: null,
}
