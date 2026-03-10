const hymns = [
  {
    id: 1,
    title: 'Abide With Me',
    titleTwi: null,
    author: 'Henry Francis Lyte',
    language: 'english',
    category: 'comfort',
    verses: [
      'Abide with me; fast falls the eventide;\nThe darkness deepens; Lord, with me abide!\nWhen other helpers fail and comforts flee,\nHelp of the helpless, O abide with me.',
      'Swift to its close ebbs out life\'s little day;\nEarth\'s joys grow dim, its glories pass away;\nChange and decay in all around I see;\nO Thou who changest not, abide with me.',
      'I need Thy presence every passing hour;\nWhat but Thy grace can foil the tempter\'s power?\nWho, like Thyself, my guide and stay can be?\nThrough cloud and sunshine, Lord, abide with me.',
      'I fear no foe, with Thee at hand to bless;\nIlls have no weight, and tears no bitterness.\nWhere is death\'s sting? Where, grave, thy victory?\nI triumph still, if Thou abide with me.',
      'Hold Thou Thy cross before my closing eyes;\nShine through the gloom and point me to the skies;\nHeav\'n\'s morning breaks, and earth\'s vain shadows flee;\nIn life, in death, O Lord, abide with me.'
    ],
    chorus: null
  },
  {
    id: 2,
    title: 'Amazing Grace',
    titleTwi: null,
    author: 'John Newton',
    language: 'english',
    category: 'worship',
    verses: [
      'Amazing grace! How sweet the sound\nThat saved a wretch like me!\nI once was lost, but now am found;\nWas blind, but now I see.',
      '\'Twas grace that taught my heart to fear,\nAnd grace my fears relieved;\nHow precious did that grace appear\nThe hour I first believed.',
      'Through many dangers, toils, and snares,\nI have already come;\n\'Tis grace hath brought me safe thus far,\nAnd grace will lead me home.',
      'The Lord has promised good to me,\nHis Word my hope secures;\nHe will my Shield and Portion be,\nAs long as life endures.',
      'When we\'ve been there ten thousand years,\nBright shining as the sun,\nWe\'ve no less days to sing God\'s praise\nThan when we\'d first begun.'
    ],
    chorus: null
  },
  {
    id: 3,
    title: 'Blessed Assurance',
    titleTwi: null,
    author: 'Fanny Crosby',
    language: 'english',
    category: 'worship',
    verses: [
      'Blessed assurance, Jesus is mine!\nO what a foretaste of glory divine!\nHeir of salvation, purchase of God,\nBorn of His Spirit, washed in His blood.',
      'Perfect submission, perfect delight,\nVisions of rapture now burst on my sight;\nAngels descending bring from above\nEchoes of mercy, whispers of love.',
      'Perfect submission, all is at rest;\nI in my Savior am happy and blest,\nWatching and waiting, looking above,\nFilled with His goodness, lost in His love.'
    ],
    chorus: 'This is my story, this is my song,\nPraising my Savior all the day long;\nThis is my story, this is my song,\nPraising my Savior all the day long.'
  },
  {
    id: 4,
    title: 'How Great Thou Art',
    titleTwi: null,
    author: 'Carl Boberg / Stuart K. Hine',
    language: 'english',
    category: 'worship',
    verses: [
      'O Lord my God, when I in awesome wonder\nConsider all the worlds Thy hands have made,\nI see the stars, I hear the rolling thunder,\nThy power throughout the universe displayed.',
      'When through the woods and forest glades I wander\nAnd hear the birds sing sweetly in the trees,\nWhen I look down from lofty mountain grandeur\nAnd hear the brook and feel the gentle breeze.',
      'And when I think that God, His Son not sparing,\nSent Him to die, I scarce can take it in;\nThat on the cross, my burden gladly bearing,\nHe bled and died to take away my sin.',
      'When Christ shall come with shout of acclamation\nAnd take me home, what joy shall fill my heart!\nThen I shall bow in humble adoration\nAnd there proclaim, my God, how great Thou art!'
    ],
    chorus: 'Then sings my soul, my Savior God, to Thee:\nHow great Thou art! How great Thou art!\nThen sings my soul, my Savior God, to Thee:\nHow great Thou art! How great Thou art!'
  },
  {
    id: 5,
    title: 'The Lord Is My Shepherd',
    titleTwi: null,
    author: 'Based on Psalm 23',
    language: 'english',
    category: 'comfort',
    verses: [
      'The Lord\'s my Shepherd, I\'ll not want;\nHe makes me down to lie\nIn pastures green; He leadeth me\nThe quiet waters by.',
      'My soul He doth restore again,\nAnd me to walk doth make\nWithin the paths of righteousness,\nE\'en for His own name\'s sake.',
      'Yea, though I walk in death\'s dark vale,\nYet will I fear no ill;\nFor Thou art with me, and Thy rod\nAnd staff me comfort still.',
      'My table Thou hast furnished\nIn presence of my foes;\nMy head Thou dost with oil anoint,\nAnd my cup overflows.',
      'Goodness and mercy all my life\nShall surely follow me;\nAnd in God\'s house forevermore\nMy dwelling place shall be.'
    ],
    chorus: null
  },
  {
    id: 6,
    title: 'Rock of Ages',
    titleTwi: null,
    author: 'Augustus Montague Toplady',
    language: 'english',
    category: 'committal',
    verses: [
      'Rock of Ages, cleft for me,\nLet me hide myself in Thee;\nLet the water and the blood,\nFrom Thy wounded side which flowed,\nBe of sin the double cure,\nSave from wrath and make me pure.',
      'Could my tears forever flow,\nCould my zeal no languor know,\nThese for sin could not atone;\nThou must save, and Thou alone:\nIn my hand no price I bring,\nSimply to Thy cross I cling.',
      'While I draw this fleeting breath,\nWhen my eyes shall close in death,\nWhen I rise to worlds unknown,\nAnd behold Thee on Thy throne,\nRock of Ages, cleft for me,\nLet me hide myself in Thee.'
    ],
    chorus: null
  },
  {
    id: 7,
    title: 'Nearer My God to Thee',
    titleTwi: null,
    author: 'Sarah Flower Adams',
    language: 'english',
    category: 'comfort',
    verses: [
      'Nearer, my God, to Thee, nearer to Thee!\nE\'en though it be a cross that raiseth me,\nStill all my song shall be,\nNearer, my God, to Thee;\nNearer, my God, to Thee, nearer to Thee!',
      'Though like the wanderer, the sun gone down,\nDarkness be over me, my rest a stone;\nYet in my dreams I\'d be\nNearer, my God, to Thee;\nNearer, my God, to Thee, nearer to Thee!',
      'There let the way appear, steps unto Heav\'n;\nAll that Thou sendest me, in mercy giv\'n;\nAngels to beckon me\nNearer, my God, to Thee;\nNearer, my God, to Thee, nearer to Thee!',
      'Then, with my waking thoughts bright with Thy praise,\nOut of my stony griefs Bethel I\'ll raise;\nSo by my woes to be\nNearer, my God, to Thee;\nNearer, my God, to Thee, nearer to Thee!',
      'Or if, on joyful wing cleaving the sky,\nSun, moon, and stars forgot, upward I fly,\nStill all my song shall be,\nNearer, my God, to Thee;\nNearer, my God, to Thee, nearer to Thee!'
    ],
    chorus: null
  },
  {
    id: 8,
    title: 'What a Friend We Have in Jesus',
    titleTwi: null,
    author: 'Joseph M. Scriven',
    language: 'english',
    category: 'comfort',
    verses: [
      'What a friend we have in Jesus,\nAll our sins and griefs to bear!\nWhat a privilege to carry\nEverything to God in prayer!\nO what peace we often forfeit,\nO what needless pain we bear,\nAll because we do not carry\nEverything to God in prayer.',
      'Have we trials and temptations?\nIs there trouble anywhere?\nWe should never be discouraged;\nTake it to the Lord in prayer.\nCan we find a friend so faithful\nWho will all our sorrows share?\nJesus knows our every weakness;\nTake it to the Lord in prayer.',
      'Are we weak and heavy laden,\nCumbered with a load of care?\nPrecious Savior, still our refuge;\nTake it to the Lord in prayer.\nDo thy friends despise, forsake thee?\nTake it to the Lord in prayer!\nIn His arms He\'ll take and shield thee;\nThou wilt find a solace there.'
    ],
    chorus: null
  },
  {
    id: 9,
    title: 'It Is Well With My Soul',
    titleTwi: null,
    author: 'Horatio G. Spafford',
    language: 'english',
    category: 'comfort',
    verses: [
      'When peace, like a river, attendeth my way,\nWhen sorrows like sea billows roll;\nWhatever my lot, Thou hast taught me to say,\nIt is well, it is well with my soul.',
      'Though Satan should buffet, though trials should come,\nLet this blest assurance control,\nThat Christ hath regarded my helpless estate,\nAnd hath shed His own blood for my soul.',
      'My sin, oh the bliss of this glorious thought!\nMy sin, not in part but the whole,\nIs nailed to the cross, and I bear it no more,\nPraise the Lord, praise the Lord, O my soul!',
      'And Lord, haste the day when my faith shall be sight,\nThe clouds be rolled back as a scroll;\nThe trump shall resound, and the Lord shall descend,\nEven so, it is well with my soul.'
    ],
    chorus: 'It is well with my soul,\nIt is well, it is well with my soul.'
  },
  {
    id: 10,
    title: 'Great Is Thy Faithfulness',
    titleTwi: null,
    author: 'Thomas O. Chisholm',
    language: 'english',
    category: 'worship',
    verses: [
      'Great is Thy faithfulness, O God my Father;\nThere is no shadow of turning with Thee;\nThou changest not, Thy compassions, they fail not;\nAs Thou hast been, Thou forever wilt be.',
      'Summer and winter and springtime and harvest,\nSun, moon, and stars in their courses above\nJoin with all nature in manifold witness\nTo Thy great faithfulness, mercy, and love.',
      'Pardon for sin and a peace that endureth,\nThine own dear presence to cheer and to guide;\nStrength for today and bright hope for tomorrow,\nBlessings all mine, with ten thousand beside!'
    ],
    chorus: 'Great is Thy faithfulness!\nGreat is Thy faithfulness!\nMorning by morning new mercies I see;\nAll I have needed Thy hand hath provided;\nGreat is Thy faithfulness, Lord, unto me!'
  },
  {
    id: 11,
    title: 'Be Still My Soul',
    titleTwi: null,
    author: 'Katharina von Schlegel / Jane Borthwick',
    language: 'english',
    category: 'comfort',
    verses: [
      'Be still, my soul: the Lord is on thy side.\nBear patiently the cross of grief or pain;\nLeave to thy God to order and provide;\nIn every change, He faithful will remain.\nBe still, my soul: thy best, thy heavenly Friend\nThrough thorny ways leads to a joyful end.',
      'Be still, my soul: thy God doth undertake\nTo guide the future, as He has the past.\nThy hope, thy confidence let nothing shake;\nAll now mysterious shall be bright at last.\nBe still, my soul: the waves and winds still know\nHis voice who ruled them while He dwelt below.',
      'Be still, my soul: the hour is hastening on\nWhen we shall be forever with the Lord,\nWhen disappointment, grief, and fear are gone,\nSorrow forgot, love\'s purest joys restored.\nBe still, my soul: when change and tears are past,\nAll safe and blessed we shall meet at last.'
    ],
    chorus: null
  },
  {
    id: 12,
    title: 'When Peace Like a River',
    titleTwi: null,
    author: 'Horatio G. Spafford',
    language: 'english',
    category: 'comfort',
    verses: [
      'When peace, like a river, attendeth my way,\nWhen sorrows like sea billows roll;\nWhatever my lot, Thou hast taught me to say,\nIt is well, it is well with my soul.',
      'Though Satan should buffet, though trials should come,\nLet this blest assurance control,\nThat Christ hath regarded my helpless estate,\nAnd hath shed His own blood for my soul.',
      'My sin, oh the bliss of this glorious thought!\nMy sin, not in part but the whole,\nIs nailed to the cross, and I bear it no more,\nPraise the Lord, praise the Lord, O my soul!',
      'For me, be it Christ, be it Christ hence to live:\nIf Jordan above me shall roll,\nNo pang shall be mine, for in death as in life\nThou wilt whisper Thy peace to my soul.',
      'And Lord, haste the day when my faith shall be sight,\nThe clouds be rolled back as a scroll;\nThe trump shall resound, and the Lord shall descend,\nEven so, it is well with my soul.'
    ],
    chorus: 'It is well with my soul,\nIt is well, it is well with my soul.'
  },
  {
    id: 13,
    title: 'In the Sweet By and By',
    titleTwi: null,
    author: 'Sanford F. Bennett',
    language: 'english',
    category: 'recessional',
    verses: [
      'There\'s a land that is fairer than day,\nAnd by faith we can see it afar;\nFor the Father waits over the way\nTo prepare us a dwelling place there.',
      'We shall sing on that beautiful shore\nThe melodious songs of the blest,\nAnd our spirits shall sorrow no more,\nNot a sigh for the blessing of rest.',
      'To our bountiful Father above,\nWe will offer our tribute of praise\nFor the glorious gift of His love\nAnd the blessings that hallow our days.'
    ],
    chorus: 'In the sweet by and by,\nWe shall meet on that beautiful shore;\nIn the sweet by and by,\nWe shall meet on that beautiful shore.'
  },
  {
    id: 14,
    title: 'Softly and Tenderly',
    titleTwi: null,
    author: 'Will L. Thompson',
    language: 'english',
    category: 'comfort',
    verses: [
      'Softly and tenderly Jesus is calling,\nCalling for you and for me;\nSee, on the portals He\'s waiting and watching,\nWatching for you and for me.',
      'Why should we tarry when Jesus is pleading,\nPleading for you and for me?\nWhy should we linger and heed not His mercies,\nMercies for you and for me?',
      'Time is now fleeting, the moments are passing,\nPassing from you and from me;\nShadows are gathering, deathbeds are coming,\nComing for you and for me.',
      'O for the wonderful love He has promised,\nPromised for you and for me!\nThough we have sinned, He has mercy and pardon,\nPardon for you and for me.'
    ],
    chorus: 'Come home, come home;\nYe who are weary, come home;\nEarnestly, tenderly, Jesus is calling,\nCalling, O sinner, come home!'
  },
  {
    id: 15,
    title: 'Beyond the Sunset',
    titleTwi: null,
    author: 'Virgil P. Brock',
    language: 'english',
    category: 'recessional',
    verses: [
      'Beyond the sunset, O blissful morning,\nWhen with our Savior heav\'n is begun;\nEarth\'s toiling ended, O glorious dawning;\nBeyond the sunset, when day is done.',
      'Beyond the sunset, no clouds will gather,\nNo storms will threaten, no fears annoy;\nO day of gladness, O day unending,\nBeyond the sunset, eternal joy!',
      'Beyond the sunset, a hand will guide me\nTo God, the Father, whom I adore;\nHis glorious presence, His words of welcome,\nWill be my portion on that fair shore.',
      'Beyond the sunset, O glad reunion,\nWith our dear loved ones who\'ve gone before;\nIn that fair homeland we\'ll know no parting,\nBeyond the sunset forevermore!'
    ],
    chorus: null
  },
  {
    id: 16,
    title: 'Lead Kindly Light',
    titleTwi: null,
    author: 'John Henry Newman',
    language: 'english',
    category: 'processional',
    verses: [
      'Lead, kindly Light, amid the encircling gloom,\nLead Thou me on!\nThe night is dark, and I am far from home;\nLead Thou me on!\nKeep Thou my feet; I do not ask to see\nThe distant scene; one step enough for me.',
      'I was not ever thus, nor prayed that Thou\nShouldst lead me on;\nI loved to choose and see my path; but now\nLead Thou me on!\nI loved the garish day, and, spite of fears,\nPride ruled my will. Remember not past years!',
      'So long Thy power hath blest me, sure it still\nWill lead me on\nO\'er moor and fen, o\'er crag and torrent, till\nThe night is gone,\nAnd with the morn those angel faces smile,\nWhich I have loved long since, and lost awhile!'
    ],
    chorus: null
  },
  {
    id: 17,
    title: 'O God Our Help in Ages Past',
    titleTwi: null,
    author: 'Isaac Watts',
    language: 'english',
    category: 'processional',
    verses: [
      'O God, our help in ages past,\nOur hope for years to come,\nOur shelter from the stormy blast,\nAnd our eternal home.',
      'Under the shadow of Thy throne\nStill may we dwell secure;\nSufficient is Thine arm alone,\nAnd our defense is sure.',
      'Before the hills in order stood,\nOr earth received her frame,\nFrom everlasting Thou art God,\nTo endless years the same.',
      'A thousand ages in Thy sight\nAre like an evening gone;\nShort as the watch that ends the night,\nBefore the rising sun.',
      'Time, like an ever rolling stream,\nBears all who breathe away;\nThey fly, forgotten, as a dream\nDies at the opening day.',
      'O God, our help in ages past,\nOur hope for years to come;\nBe Thou our guide while life shall last,\nAnd our eternal home.'
    ],
    chorus: null
  },
  {
    id: 18,
    title: 'The Old Rugged Cross',
    titleTwi: null,
    author: 'George Bennard',
    language: 'english',
    category: 'worship',
    verses: [
      'On a hill far away stood an old rugged cross,\nThe emblem of suffering and shame;\nAnd I love that old cross where the dearest and best\nFor a world of lost sinners was slain.',
      'O that old rugged cross, so despised by the world,\nHas a wondrous attraction for me;\nFor the dear Lamb of God left His glory above\nTo bear it to dark Calvary.',
      'In that old rugged cross, stained with blood so divine,\nA wondrous beauty I see,\nFor \'twas on that old cross Jesus suffered and died,\nTo pardon and sanctify me.',
      'To that old rugged cross I will ever be true,\nIts shame and reproach gladly bear;\nThen He\'ll call me some day to my home far away,\nWhere His glory forever I\'ll share.'
    ],
    chorus: 'So I\'ll cherish the old rugged cross,\nTill my trophies at last I lay down;\nI will cling to the old rugged cross,\nAnd exchange it some day for a crown.'
  },
  {
    id: 19,
    title: 'Onward Christian Soldiers',
    titleTwi: null,
    author: 'Sabine Baring-Gould',
    language: 'english',
    category: 'processional',
    verses: [
      'Onward, Christian soldiers, marching as to war,\nWith the cross of Jesus going on before!\nChrist, the royal Master, leads against the foe;\nForward into battle, see His banners go!',
      'Like a mighty army moves the church of God;\nBrothers, we are treading where the saints have trod;\nWe are not divided; all one body we,\nOne in hope and doctrine, one in charity.',
      'Crowns and thrones may perish, kingdoms rise and wane,\nBut the church of Jesus constant will remain;\nGates of hell can never gainst that church prevail;\nWe have Christ\'s own promise, and that cannot fail.',
      'Onward, then, ye people, join our happy throng,\nBlend with ours your voices in the triumph song;\nGlory, laud, and honor unto Christ the King;\nThis through countless ages men and angels sing.'
    ],
    chorus: 'Onward, Christian soldiers, marching as to war,\nWith the cross of Jesus going on before!'
  },
  {
    id: 20,
    title: 'Safe in the Arms of Jesus',
    titleTwi: null,
    author: 'Fanny Crosby',
    language: 'english',
    category: 'committal',
    verses: [
      'Safe in the arms of Jesus,\nSafe on His gentle breast,\nThere by His love o\'ershaded,\nSweetly my soul shall rest.\nHark! \'Tis the voice of angels,\nBorne in a song to me,\nOver the fields of glory,\nOver the jasper sea.',
      'Safe in the arms of Jesus,\nSafe from corroding care,\nFree from the blight of sorrow,\nFree from my doubts and fears;\nOnly a few more trials,\nOnly a few more tears!\nSafe in the arms of Jesus,\nSafe on His gentle breast.',
      'Jesus, my heart\'s dear Refuge,\nJesus has died for me;\nFirm on the Rock of Ages,\nEver my trust shall be.\nHere let me wait with patience,\nWait till the night is o\'er;\nWait till I see the morning\nBreak on the golden shore.'
    ],
    chorus: 'Safe in the arms of Jesus,\nSafe on His gentle breast,\nThere by His love o\'ershaded,\nSweetly my soul shall rest.'
  },
  {
    id: 21,
    title: 'Aseda',
    titleTwi: 'Aseda',
    author: 'Traditional Ghanaian',
    language: 'twi',
    category: 'worship',
    verses: [
      'Aseda nka Onyankop\u0254n,\nAseda, aseda;\nNea \u0254y\u025b me kese yi,\nAseda, aseda.',
      'Onyame ay\u025b me adoe,\nAseda, aseda;\n\u0186de ne dom ahy\u025b me mu,\nAseda, aseda.',
      'Me nkwa mu nyinaa,\nAseda, aseda;\nMede b\u025bma Onyankop\u0254n,\nAseda, aseda.',
      'S\u025b menya me ho a,\nAseda, aseda;\nMeyi n\'ay\u025b daa daa,\nAseda, aseda.'
    ],
    chorus: 'Aseda, aseda, aseda nka Onyankop\u0254n;\nAseda, aseda, aseda nka no.'
  },
  {
    id: 22,
    title: 'Onyame Ne Hene',
    titleTwi: 'Onyame Ne Hene',
    author: 'Traditional Ghanaian',
    language: 'twi',
    category: 'worship',
    verses: [
      'Onyame ne Hene,\n\u0186ne Tumfo\u0254;\n\u0186no na \u0254b\u0254\u0254 ewiase,\nNe ne mu nneema nyinaa.',
      '\u0186no na \u0254di hene,\nW\u0254 soro ne asaase;\nTumi nyinaa y\u025b ne dea,\nOnyame ne Hene.',
      'Y\u025bnka ne nkunim,\nY\u025bnkamfo ne din;\nEfise \u0254y\u025b kese,\nOnyame ne Hene.',
      'Momma y\u025bnsom no,\nY\u025bnkot\u0254w no ase;\n\u0186no nko ara ne Nyame,\nOnyame ne Hene.'
    ],
    chorus: 'Onyame ne Hene, Onyame ne Hene;\n\u0186no nko ara ne Nyame,\nOnyame ne Hene.'
  },
  {
    id: 23,
    title: 'Me Nyame Ye Kese',
    titleTwi: 'Me Nyame Y\u025b Kese',
    author: 'Traditional Ghanaian',
    language: 'twi',
    category: 'worship',
    verses: [
      'Me Nyame y\u025b kese,\n\u0186y\u025b kese, \u0254y\u025b kese;\nMe Nyame y\u025b kese,\n\u0186y\u025b ade nyinaa.',
      '\u0186b\u0254\u0254 \u0254soro ne asaase,\n\u0186b\u0254\u0254 epo ne nsubonton;\nMe Nyame y\u025b kese,\n\u0186y\u025b ade nyinaa.',
      'Obiara nte s\u025b no,\nObiara nni s\u025b no;\nMe Nyame y\u025b kese,\n\u0186y\u025b ade nyinaa.',
      'Y\u025bnkamfo ne din,\nY\u025bnyi n\'ay\u025b;\nMe Nyame y\u025b kese,\n\u0186y\u025b ade nyinaa.'
    ],
    chorus: 'Me Nyame y\u025b kese, \u0254y\u025b kese;\n\u0186y\u025b ade nyinaa, \u0254y\u025b kese!'
  },
  {
    id: 24,
    title: 'Awurade Kasa',
    titleTwi: 'Awurade Kasa',
    author: 'Traditional Ghanaian',
    language: 'twi',
    category: 'comfort',
    verses: [
      'Awurade kasa,\nWo somfo tie;\nAwurade kasa,\nMa me nte w\'asem.',
      'Kasa w\u0254 sum mu,\nKasa w\u0254 hann mu;\nAwurade kasa,\nMa me nte w\'asem.',
      'Kasa ma me koma,\nNte w\'anigye;\nAwurade kasa,\nKyer\u025b me wo kwan.',
      'S\u025b wo kasa a,\nMe kra nya ahomeka;\nAwurade kasa,\nMa me nte w\'asem.'
    ],
    chorus: 'Awurade kasa, kasa, kasa;\nMa me nte w\'asem.\nAwurade kasa, kasa, kasa;\nWo somfo retie.'
  },
  {
    id: 25,
    title: 'Yesu Ye Me Dea',
    titleTwi: 'Yesu Y\u025b Me Dea',
    author: 'Traditional Ghanaian',
    language: 'twi',
    category: 'comfort',
    verses: [
      'Yesu y\u025b me dea,\nMe dea, me dea;\nYesu y\u025b me dea,\nDaa daa daa.',
      '\u0186y\u025b me Gyefo,\nMe Nkwagye Hy\u025bn;\nYesu y\u025b me dea,\nDaa daa daa.',
      '\u0186tantan me ho,\nBan me wim mu;\nYesu y\u025b me dea,\nDaa daa daa.',
      'Owu mu mpo,\nMesr\u0254 no daa;\nYesu y\u025b me dea,\nDaa daa daa.',
      'Me de me ho nyinaa,\nMema Yesu;\nYesu y\u025b me dea,\nDaa daa daa.'
    ],
    chorus: 'Yesu y\u025b me dea, me dea;\nDaa daa, \u0254y\u025b me dea;\nYesu y\u025b me dea, me dea;\nDaa daa daa.'
  }
]

export default hymns
