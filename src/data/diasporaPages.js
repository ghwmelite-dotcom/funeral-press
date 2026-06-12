// src/data/diasporaPages.js
// Diaspora landing page content (spec §3.4). Pure messaging — every feature
// referenced already exists. Voice: Solemn Radiance — warm, practical, dignified.

export const DIASPORA_PAGES = {
  'plan-a-funeral-in-ghana-from-abroad': {
    breadcrumb: 'Plan from abroad',
    title: 'Plan a Funeral in Ghana From Abroad | FuneralPress',
    description: 'Organise a dignified funeral in Ghana from the UK, US, or anywhere abroad: shared budget planner, remote design collaboration, print delivery in Ghana, and live-streamed services.',
    h1: 'Plan a funeral in Ghana from abroad',
    intro: 'When you lose someone at home while you are far away, the distance hurts twice. Calls at strange hours, money sent in pieces, decisions made without you. FuneralPress was built in Ghana for exactly this moment — one place where your family at home and your family abroad plan together, see the same numbers, and honour your loved one properly.',
    cta: { to: '/budget-planner', label: 'Start a shared budget' },
    sections: [
      {
        heading: 'One budget the whole family can see',
        paragraphs: [
          'Ghanaian funerals are funded by many hands — siblings in London, cousins in Accra, an aunt in New Jersey. The shared budget planner tracks every line: casket, venue, catering, cloth, printing, transport. Each family member sees what has been pledged and what remains, in real time, on any phone.',
          'No more conflicting figures over WhatsApp. When the family head updates a cost in Accra, you see it in Manchester the same minute. Contributions are recorded against names, so the accounting at the family meeting takes minutes, not hours.',
        ],
        link: { to: '/budget-planner', label: 'Open the budget planner' },
      },
      {
        heading: 'Design the brochure together, print it in Ghana',
        paragraphs: [
          'The funeral brochure carries the weight of how your person is remembered. With FuneralPress you design it yourself in minutes — choose a theme, add their photo, write the biography with help from the AI tribute writer, pick hymns from a library of more than ten thousand.',
          'Designs save to the cloud, so your sister in Kumasi can review and edit the same brochure you started in Toronto. When it is ready, order printing inside the app and have finished brochures delivered to the family house in Ghana — you never need to courier anything across an ocean.',
        ],
        link: { to: '/funeral-brochure-designer', label: 'See the brochure designer' },
      },
      {
        heading: 'A memorial page for everyone who cannot travel',
        paragraphs: [
          'Not everyone can board a flight. A memorial page gives your loved one a permanent online tribute — their story, their photographs, a guest book where friends from every country leave condolences, and a live-stream link for the service itself.',
          'Share one link on WhatsApp and the whole diaspora attends, contributes, and grieves together. QR codes printed on the brochure connect the physical ceremony to the online tribute, so even guests at the graveside can sign the guest book from their phones.',
        ],
        link: { to: '/memorial-page-creator', label: 'Create a memorial page' },
      },
      {
        heading: 'Watch the service live from anywhere',
        paragraphs: [
          'When travel is impossible — visa timing, work, young children — you should still be in the room. FuneralPress live service pages let the family stream the funeral and one-week observance to relatives abroad, with the order of service alongside the video so you can follow every hymn and tribute.',
        ],
        link: { to: '/diaspora/watch-a-funeral-from-abroad', label: 'How live streaming works' },
      },
      {
        heading: 'Pay in pounds or dollars, deliver in Ghana',
        paragraphs: [
          'You can pay for designs, memorial pages, and printing in GBP or USD with your usual card — no forex transfers, no asking family at home to front the cost. Family in Ghana can pay their own way in cedis with mobile money. Same tools, same account, each person in their own currency.',
        ],
        link: null,
      },
    ],
    faqs: [
      { question: 'Can I plan a Ghanaian funeral entirely from the UK or US?', answer: 'Yes. The budget planner, brochure designer, memorial pages, and print ordering all work from anywhere. You design and coordinate online; printing is produced and delivered inside Ghana to your family. Many families split the work — relatives abroad handle design and contributions, relatives at home handle venue and logistics — inside one shared account.' },
      { question: 'How do family members in different countries work on the same funeral?', answer: 'Designs and budgets are cloud-synced. Anyone you share access with sees the latest version instantly — edits made in Accra appear in London the moment they save. The budget planner records each contribution against a name so the family accounting stays transparent.' },
      { question: 'Can I pay in pounds or dollars?', answer: 'Yes. Card payments in GBP and USD are processed securely through Stripe. Family members in Ghana pay in cedis via mobile money or card through Paystack. Prices are shown in your local currency automatically, and you can switch currency at any time.' },
      { question: 'How does printed material reach the family in Ghana?', answer: 'Order printing directly inside FuneralPress. Brochures, posters, and invitation cards are printed in Ghana and delivered to any of the sixteen regions — you choose the delivery address, typically the family house or the funeral venue.' },
      { question: 'What does it cost?', answer: 'Creating designs is free — you pay only to download finished, watermark-free files. A single design, a three-design bundle, or unlimited access are all one-time purchases, with Pro subscriptions for families who need more. Prices display in your currency on every page.' },
      { question: 'Is FuneralPress only for Ghanaian funerals?', answer: 'FuneralPress is built around Ghanaian funeral traditions — Adinkra symbolism, one-week observances, aseda cloth, and a hymn library spanning English, Twi, and Ga — but families across West Africa and the diaspora use it wherever they are.' },
    ],
  },

  'watch-a-funeral-from-abroad': {
    breadcrumb: 'Watch from abroad',
    title: 'Watch a Funeral in Ghana Live From Abroad | FuneralPress',
    description: 'Attend a funeral in Ghana from anywhere: live-streamed services with the order of service on screen, memorial pages, and a digital guest book for condolences from overseas.',
    h1: 'Be present, even from far away',
    intro: 'Sometimes the flight is impossible. A visa that will not come in time, children who cannot miss school, work that will not release you. Missing the funeral of someone you love is one of the quiet griefs of diaspora life. FuneralPress makes sure distance does not mean absence.',
    cta: { to: '/memorial-page-creator', label: 'Set up a memorial with live stream' },
    sections: [
      {
        heading: 'A live stream built into the memorial',
        paragraphs: [
          'Your family adds a live-stream link to the memorial page, and everyone abroad watches the service in real time — burial service, thanksgiving service, or the one-week observance. The page shows the order of service alongside the stream, so you can follow each hymn, tribute, and scripture reading as it happens.',
          'There is nothing to install. The memorial link opens in any phone or laptop browser, anywhere in the world.',
        ],
        link: null,
      },
      {
        heading: 'Sign the guest book from any country',
        paragraphs: [
          'The digital guest book collects condolence messages from everyone who could not travel — short tributes, memories, words of comfort for the family. Messages arrive instantly and remain part of the memorial permanently, so the family in Ghana feels the breadth of love their person commanded across the world.',
        ],
        link: { to: '/guest-book-creator', label: 'About digital guest books' },
      },
      {
        heading: 'Light a candle, lay flowers, leave a tribute',
        paragraphs: [
          'Beyond words, the memorial page lets you light a virtual candle or lay flowers in your loved one\'s honour — small acts of presence that appear on the tribute wall with your name. For many in the diaspora these gestures matter deeply: a way of saying I was there, in the only way I could be.',
        ],
        link: null,
      },
      {
        heading: 'Contribute to the funeral from abroad',
        paragraphs: [
          'The shared budget planner records contributions from family members in every country, and memorial pages can accept donations directly. Your support reaches the family transparently — every pledge logged, every contribution acknowledged.',
        ],
        link: { to: '/budget-planner', label: 'See the shared budget planner' },
      },
    ],
    faqs: [
      { question: 'How do I watch a funeral in Ghana from the UK or US?', answer: 'Ask the family to add their live-stream link to the FuneralPress memorial page, then open the memorial link they share on WhatsApp. The stream plays in your browser with the order of service beside it — no app or account required to watch.' },
      { question: 'What if I miss the live service because of the time difference?', answer: 'The memorial page remains, with the photographs, biography, tributes, and guest book. Many families also keep the recording linked on the page, and premium memorials retain livestream links for years.' },
      { question: 'Can I send condolences if I cannot attend?', answer: 'Yes. Sign the digital guest book from anywhere, light a virtual candle, or lay virtual flowers. Your message appears on the memorial instantly and permanently, with your name.' },
      { question: 'Can I contribute money to the funeral from abroad?', answer: 'Yes. Memorial pages can accept donations, and the shared budget planner records pledges and contributions from relatives in every country, so the family accounting stays clear and transparent.' },
      { question: 'Does the family need technical skills to set this up?', answer: 'No. Creating a memorial page takes minutes on a phone — add photos, the biography, and the service details, then paste in any live-stream link. FuneralPress generates the shareable link and QR codes automatically.' },
    ],
  },

  'funeral-order-of-service-template': {
    breadcrumb: 'Order of service',
    title: 'Funeral Order of Service Template — Ghanaian Services | FuneralPress',
    description: 'Create a funeral order of service for a Ghanaian funeral: print-ready templates with hymns, tributes, biography, and photos. Designed in minutes, delivered in the UK terminology you search for.',
    h1: 'A funeral order of service, the Ghanaian way',
    intro: 'In the UK it is called an order of service; in Ghana we call it the funeral brochure or programme. Whatever name you use, it is the booklet every guest holds — the photographs, the biography, the hymns, the tributes, the order of events. FuneralPress creates it in minutes, properly and beautifully.',
    cta: { to: '/funeral-brochure-designer', label: 'Start your order of service' },
    sections: [
      {
        heading: 'Templates designed for Ghanaian services',
        paragraphs: [
          'Generic templates do not understand our services. A Ghanaian funeral programme carries the full order of both the burial service and the thanksgiving, the family tree, the appellations, tributes from children and grandchildren, and often Adinkra symbolism in the design itself.',
          'FuneralPress themes — Black and Gold, Kente Gold, Burgundy, Ivory and more — are designed for exactly this. Choose one, add your photographs and text, and the layout stays elegant whether your programme runs four pages or forty.',
        ],
        link: { to: '/themes', label: 'Browse the themes' },
      },
      {
        heading: 'Hymns, tributes, and the full order of events',
        paragraphs: [
          'Search a library of more than ten thousand hymns — English, Twi, and Ga — and add full lyrics to your programme with one tap. The AI tribute writer helps you shape the biography and tributes when the words will not come, guided by what you tell it about their life, faith, and family.',
        ],
        link: { to: '/hymns', label: 'Search the hymn library' },
      },
      {
        heading: 'Print in Ghana or download and print locally',
        paragraphs: [
          'Download a print-ready PDF and take it to any printer near you in the UK or US — or order printing inside the app and have finished booklets delivered to the family in Ghana. Both routes produce the same professional result; choose whichever suits the family plan.',
        ],
        link: null,
      },
      {
        heading: 'Designed together across continents',
        paragraphs: [
          'Order-of-service decisions are family decisions. Cloud-synced designs mean the daughter in London drafts the biography, the son in Accra corrects the family names, and the family head approves the final version — all in the same document, without emailing files back and forth.',
        ],
        link: { to: '/diaspora/plan-a-funeral-in-ghana-from-abroad', label: 'Planning from abroad — the full guide' },
      },
    ],
    faqs: [
      { question: 'What goes in a Ghanaian funeral order of service?', answer: 'Typically: a cover with the photograph and dates, the order of the burial and thanksgiving services, the biography, tributes from spouse, children, grandchildren and colleagues, hymns with full lyrics, the family tree or appellations, and acknowledgements. FuneralPress templates carry sections for all of these.' },
      { question: 'How quickly can I create one?', answer: 'A simple programme takes under thirty minutes: choose a theme, upload photographs, paste or write the biography and tributes, add hymns from the library, and export. The AI tribute writer speeds up the writing when grief makes it hard.' },
      { question: 'Can I print it in the UK instead of Ghana?', answer: 'Yes. Download the print-ready PDF and use any local printer. Files are produced at print resolution with proper margins. Alternatively, order printing in the app for delivery to the family in Ghana.' },
      { question: 'How much does an order of service template cost?', answer: 'Designing is free. A single watermark-free download is a small one-time payment shown in your currency — pounds, dollars, or cedis. Bundles and unlimited plans cover posters, invitations, and thank-you cards as well.' },
      { question: 'Can the family in Ghana edit the same programme?', answer: 'Yes. Designs sync to the cloud, so anyone with access edits the same document. Changes made in Ghana appear for relatives abroad immediately.' },
    ],
  },

  'send-condolences-to-ghana': {
    breadcrumb: 'Send condolences',
    title: 'Send Condolences to Ghana From Abroad | FuneralPress',
    description: 'Send condolences to a bereaved family in Ghana: sign the digital guest book, light a virtual candle, contribute to the funeral, or send a wreath card — from anywhere in the world.',
    h1: 'Send your condolences home',
    intro: 'When word reaches you that someone has passed at home, the first instinct is to be there. When you cannot, what matters is that the family feels you — your words, your support, your presence in whatever form it can take. Here is how to honour someone in Ghana from wherever you are.',
    cta: { to: '/honour', label: 'Honour someone you’ve lost' },
    sections: [
      {
        heading: 'Sign the guest book',
        paragraphs: [
          'If the family has a FuneralPress memorial or guest book page, your message of condolence reaches them instantly and stays forever. Write in English or your home language; speak to the family or to the one who has gone. These messages are read aloud at family gatherings and kept for years.',
        ],
        link: { to: '/guest-book-creator', label: 'How guest books work' },
      },
      {
        heading: 'Light a candle or lay flowers on the memorial',
        paragraphs: [
          'Memorial pages carry a tribute wall where you can light a virtual candle, lay flowers, or leave a longer tribute with your name. It is a small ceremony of its own — visible to the family and to every mourner who visits the page.',
        ],
        link: null,
      },
      {
        heading: 'Contribute to the funeral costs',
        paragraphs: [
          'Funerals at home are a collective duty, and distance does not excuse us from it — nsawa is nsawa. Where the family uses the shared budget planner, your contribution is pledged and recorded against your name transparently. Memorial pages can also accept direct donations.',
        ],
        link: { to: '/budget-planner', label: 'About the shared budget planner' },
      },
      {
        heading: 'Send a wreath card with your flowers',
        paragraphs: [
          'If you are arranging flowers or a wreath through family at home, design the accompanying wreath card yourself — your names, your message, properly typeset — and have it printed in Ghana with the rest of the funeral stationery.',
        ],
        link: { to: '/wreath-cards', label: 'Design a wreath card' },
      },
      {
        heading: 'When the family has no memorial page yet',
        paragraphs: [
          'Suggest one. A memorial page takes minutes to create and gives the whole diaspora a single place to mourn, contribute, and attend the live-streamed service. You can even create it yourself and hand it to the family head to approve and share.',
        ],
        link: { to: '/memorial-page-creator', label: 'Create a memorial page' },
      },
    ],
    faqs: [
      { question: 'How do I send condolences to a family in Ghana?', answer: 'The simplest way is the family\'s memorial or guest book link — your message arrives instantly and permanently. If they do not have one, a memorial page takes minutes to set up and gives everyone abroad a place to mourn together.' },
      { question: 'What should I write in a condolence message?', answer: 'Speak plainly and from the heart. Name what the person meant to you, offer a memory if you have one, and address the family with respect — "Due, due, due" carries more comfort than perfect English. Messages in Twi, Ga, Ewe, or any language are welcome.' },
      { question: 'Can I send money for the funeral from abroad?', answer: 'Yes. Where the family uses the shared budget planner your pledge is recorded transparently against your name, and memorial pages can accept direct donations. This keeps the family accounting clear and your contribution acknowledged.' },
      { question: 'Can I attend the funeral remotely?', answer: 'If the family adds a live-stream link to the memorial page, you watch the service in real time from any browser, with the order of service displayed alongside.' },
      { question: 'Is it appropriate to light a virtual candle?', answer: 'Yes. Virtual candles, flowers, and tributes are widely embraced as acts of presence for those who cannot travel. They appear on the memorial\'s tribute wall with your name, visible to the family and all mourners.' },
    ],
  },

  nigeria: {
    breadcrumb: 'Nigeria',
    title: 'Plan a Funeral in Nigeria From Abroad | FuneralPress',
    description: 'Organise a burial in Nigeria from the UK, US, or anywhere abroad: design the funeral programme, build a memorial page with live streaming, coordinate family contributions, and pay by card in pounds or dollars.',
    h1: 'Plan a funeral in Nigeria from abroad',
    intro: 'Burials at home are sacred obligations, and organising one from London, Houston, or Toronto is hard — the calls, the transfers, the programme that must be perfect because everyone will hold it. FuneralPress gives Nigerian families abroad one place to design, coordinate, and honour properly.',
    cta: { to: '/funeral-brochure-designer', label: 'Design the funeral programme' },
    sections: [
      {
        heading: 'The funeral programme, designed by you',
        paragraphs: [
          'The programme — order of service, biography, tributes, hymns, photographs — is the document every guest keeps. Design it yourself with templates built for West African services: space for the full order of the wake-keeping, funeral service, and outing service or thanksgiving, tributes from family and associations, and elegant layouts that hold many photographs well.',
          'Download a print-ready PDF to print anywhere — Lagos, London, or Houston — and share the design with family for review before anything goes to press.',
        ],
        link: { to: '/funeral-brochure-designer', label: 'Open the programme designer' },
      },
      {
        heading: 'A memorial page the whole family shares',
        paragraphs: [
          'A permanent online tribute with their story and photographs, a guest book for condolences from every continent, and a live-stream link so relatives who cannot travel attend the service in real time. One link on WhatsApp reaches the entire family network.',
        ],
        link: { to: '/memorial-page-creator', label: 'Create a memorial page' },
      },
      {
        heading: 'Coordinate contributions transparently',
        paragraphs: [
          'The shared budget planner tracks every cost and every pledge across the family — who is covering the casket, who the canopies, who the aso ebi. Everyone sees the same figures in real time, which keeps peace in the family and dignity in the planning.',
        ],
        link: { to: '/budget-planner', label: 'Open the budget planner' },
      },
      {
        heading: 'Pay by card in pounds or dollars',
        paragraphs: [
          'Pay for designs and memorial features in GBP or USD with your usual card, processed securely by Stripe. No forex transfers, no waiting for someone at home to pay first. Prices display in your currency across the site.',
        ],
        link: null,
      },
    ],
    faqs: [
      { question: 'Does FuneralPress work for Nigerian funerals?', answer: 'Yes. The programme designer, memorial pages, guest books, budget planner, and live-stream support all work for Nigerian services — wake-keeping, funeral service, and outing or thanksgiving service — from anywhere in the world.' },
      { question: 'Can I pay in naira?', answer: 'Naira payments are coming. Today you can pay by card in pounds, dollars, or Ghanaian cedis. Most diaspora families pay in GBP or USD; prices display automatically in your currency.' },
      { question: 'Can I print the programme in Nigeria?', answer: 'Download the print-ready PDF and take it to any printer in Nigeria — files are produced at print resolution with proper margins. In-app print fulfilment currently delivers within Ghana.' },
      { question: 'How do relatives abroad attend the burial?', answer: 'Add a live-stream link to the memorial page and relatives watch the service in real time from any browser, sign the guest book, and leave tributes — no app required.' },
      { question: 'How do we manage family contributions from three countries?', answer: 'The shared budget planner records every pledge and payment against a name, visible to all family members in real time. It replaces the spreadsheet, the group-chat arithmetic, and the arguments.' },
    ],
  },
}
