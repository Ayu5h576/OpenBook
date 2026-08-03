import { Book, Collection, Achievement, Quote, Author, ReaderUser } from '../types';

export const currentUser: ReaderUser = {
  name: "Astrid Lindgren",
  username: "astrid_reader",
  avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80",
  email: "astrid@openbook.library",
  bio: "Architect by day, bibliophile by twilight. Collector of rare Scandinavian literature, philosophy, and architectural design prints.",
  followingCount: 142,
  followersCount: 890,
  streakDays: 14,
  todayMinutesRead: 35,
  todayGoalMinutes: 45,
  yearlyGoalBooks: 30,
  yearlyReadBooks: 18,
  currentBookId: "book-1",
};

export const sampleBooks: Book[] = [
  {
    id: "book-1",
    title: "The Architecture of Solitude",
    author: "Elena Rostova",
    authorId: "author-1",
    cover: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80",
    spineColor: "#2C3531",
    spineTextColor: "#E0A96D",
    thickness: 38,
    pages: 412,
    pagesRead: 284,
    publisher: "Atelier Nordic Press",
    publishedYear: 2023,
    language: "English",
    isbn: "978-0-393-02000-8",
    rating: 4.9,
    reviewCount: 328,
    genres: ["Architecture", "Philosophy", "Scandinavian Design", "Essays"],
    description: "A breathtaking meditation on physical spaces, sanctuary, and how interior quietude shapes human consciousness. Drawing from Nordic timber structures, isolated monasteries, and modern minimalist dwellings.",
    status: "reading",
    favorite: true,
    progress: 68,
    lastOpened: "Today at 08:20 AM",
    quote: "Silence is not the absence of sound, but the presence of room to breathe.",
    memoryCard: {
      quote: "In the depth of winter, I finally learned that within me there lay an invincible summer.",
      topTakeaway: "True interior luxury is defined by light, proportion, and quiet contemplation.",
      rating: 5,
      moodTag: "Reflective & Serene",
      finishedDate: "2026-07-28"
    },
    chapters: [
      {
        id: 1,
        title: "Chapter I: The Sanctuary of Light",
        content: `In the quiet Nordic fjords, timber structures do not fight the winter daylight; they welcome it as a sacred guest. Sunlight filters through long spruce beams, casting elongated shadows across wide pine floorboards that have aged gracefully for over a century.

To understand space is to understand silence. When we step inside a room built with quiet reverence, the clutter of the exterior world dissolves. The walls do not merely enclose us; they protect our internal reflections from the noise of acceleration.

Consider the traditional Swedish 'torp'—a humble wooden cabin painted in Falu red. Its windows face south to catch the lowest winter sun, while its hearth occupies the exact center of gravity. Everything revolves around warmth, light, and essential human presence.`
      },
      {
        id: 2,
        title: "Chapter II: Timber, Stone, and Memory",
        content: `Materials carry memories. Freshly planed oak releases a faint aroma of vanilla and forest soil that lingers in a quiet library for generations. Stone retains the coolness of deep earth, anchoring our feet when our minds drift into abstraction.

When human hands shape raw materials with patience, a subtle resonance enters the object. A hand-carved wooden reading chair does not feel like an industrial assembly; it feels like an extended dialogue between the craftsman and the tree.`
      },
      {
        id: 3,
        title: "Chapter III: The Art of the Threshold",
        content: `Every door frame is a pause between worlds. In traditional Japanese and Scandinavian architecture alike, the entry hall serves as a cleansing chamber. Here, boots are shed, coats hung, and heavy thoughts deposited at the threshold before entering the hearth.`
      }
    ],
    notes: [
      { id: "note-1", chapter: 1, text: "The concept of light as a guest rather than a resource is profound.", date: "Aug 1, 2026", page: 42 },
      { id: "note-2", chapter: 2, text: "Aroma of planed oak—must remember this for my home study design.", date: "Aug 2, 2026", page: 110 }
    ],
    highlights: [
      { id: "hl-1", chapter: 1, text: "Silence is not the absence of sound, but the presence of room to breathe.", color: "amber", date: "Aug 1, 2026" },
      { id: "hl-2", chapter: 2, text: "Materials carry memories. Freshly planed oak releases a faint aroma of vanilla and forest soil.", color: "sage", date: "Aug 2, 2026" }
    ],
    comments: [
      { id: "c-1", user: "Clara Vance", avatar: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80", text: "This chapter changed how I view my apartment's natural morning light. Exquisite prose.", date: "2 days ago", likes: 24 },
      { id: "c-2", user: "Marcus Thorne", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80", text: "Rereading Chapter II with a cup of black coffee on a rainy morning. Absolute bliss.", date: "Yesterday", likes: 18 }
    ]
  },
  {
    id: "book-2",
    title: "Shadows in the Fjords",
    author: "Soren Kjaer",
    authorId: "author-2",
    cover: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=800&q=80",
    spineColor: "#1B263B",
    spineTextColor: "#E0E1DD",
    thickness: 42,
    pages: 480,
    pagesRead: 480,
    publisher: "Nordic Noir Editions",
    publishedYear: 2022,
    language: "English",
    isbn: "978-1-5011-8022-4",
    rating: 4.7,
    reviewCount: 512,
    genres: ["Mystery", "Nordic Noir", "Psychological Thriller", "Fiction"],
    description: "An atmospheric mystery set in a remote Norwegian coastal valley during the endless polar night. When an ancient manuscript surfaces in an abandoned wooden stave church, secrets spanning three centuries begin to unravel.",
    status: "completed",
    finishedDate: "2026-07-20",
    favorite: true,
    progress: 100,
    lastOpened: "Jul 20, 2026",
    quote: "The fjords keep no records, yet they remember every storm that ever broke upon their waters.",
    memoryCard: {
      quote: "The fjords keep no records, yet they remember every storm that ever broke upon their waters.",
      topTakeaway: "Unresolved history inevitably surfaces when winter reaches its quietest peak.",
      rating: 5,
      moodTag: "Cozy & Mystical",
      finishedDate: "2026-07-20"
    },
    chapters: [
      {
        id: 1,
        title: "Chapter I: The Arrival at Solvorn",
        content: `The ferry glided through dark, mirror-smooth water that reflected mountain peaks draped in mist. Solveig leaned against the frosted wooden rail, wrapping her wool scarf tighter against the biting fjord wind. Solvorn looked like a postcard painted in shades of slate gray and muted ochre.`
      }
    ],
    notes: [],
    highlights: [],
    comments: []
  },
  {
    id: "book-3",
    title: "Letters to a Young Poet",
    author: "Rainer Maria Rilke",
    authorId: "author-3",
    cover: "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=800&q=80",
    spineColor: "#4A3B32",
    spineTextColor: "#F1E3D3",
    thickness: 24,
    pages: 128,
    pagesRead: 40,
    publisher: "Penguin Classics",
    publishedYear: 1929,
    language: "English",
    isbn: "978-0-14-044922-8",
    rating: 4.95,
    reviewCount: 1420,
    genres: ["Classic Literature", "Poetry", "Philosophy", "Essays"],
    description: "Ten timeless, deeply intimate letters offering wisdom on creativity, solitude, patience, and living the questions of life.",
    status: "reading",
    favorite: true,
    progress: 31,
    lastOpened: "Yesterday at 10:15 PM",
    quote: "Have patience with everything that remains unsolved in your heart and try to love the questions themselves.",
    chapters: [
      {
        id: 1,
        title: "Letter I: Paris, February 17, 1903",
        content: `You ask whether your verses are good. You ask me. You have asked others before. You send them to magazines. You compare them with other poems... Now since you have allowed me to advise you, I beg you to give up all that.

Go into yourself. Search for the reason that bids you write; find out whether it is spreading its roots in the deepest places of your heart; confess to yourself whether you would have to die if you were forbidden to write.`
      }
    ],
    notes: [],
    highlights: [],
    comments: []
  },
  {
    id: "book-4",
    title: "The Craft of Thinking",
    author: "Dr. Julian Thorne",
    authorId: "author-4",
    cover: "https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=800&q=80",
    spineColor: "#2D4030",
    spineTextColor: "#C2D4C3",
    thickness: 34,
    pages: 320,
    pagesRead: 0,
    publisher: "Oxford University Press",
    publishedYear: 2024,
    language: "English",
    isbn: "978-0-19-880011-2",
    rating: 4.6,
    reviewCount: 180,
    genres: ["Psychology", "Cognitive Science", "Philosophy", "Non-Fiction"],
    description: "A masterclass in mental clarity, deep focus, and cognitive architecture in an age of fragmented digital noise.",
    status: "wishlist",
    priority: "high",
    price: "$24.99",
    availability: "In Stock",
    readingOrder: 1,
    favorite: false,
    progress: 0,
    lastOpened: "Never",
    chapters: [],
    notes: [],
    highlights: [],
    comments: []
  },
  {
    id: "book-5",
    title: "The Daily Stoic",
    author: "Ryan Holiday",
    authorId: "author-5",
    cover: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=800&q=80",
    spineColor: "#3B2219",
    spineTextColor: "#D4B2A7",
    thickness: 36,
    pages: 416,
    pagesRead: 210,
    publisher: "Portfolio",
    publishedYear: 2016,
    language: "English",
    isbn: "978-0-7352-1173-5",
    rating: 4.8,
    reviewCount: 2100,
    genres: ["Philosophy", "Stoicism", "Self-Improvement", "Daily Readings"],
    description: "366 meditations on wisdom, perseverance, and the art of living drawn from Seneca, Epictetus, and Marcus Aurelius.",
    status: "reading",
    favorite: false,
    progress: 50,
    lastOpened: "3 days ago",
    chapters: [],
    notes: [],
    highlights: [],
    comments: []
  },
  {
    id: "book-6",
    title: "Japanese Woodworking & Modern Spaces",
    author: "Kenji Takahashi",
    authorId: "author-6",
    cover: "https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&w=800&q=80",
    spineColor: "#4E3629",
    spineTextColor: "#E6CDB8",
    thickness: 40,
    pages: 350,
    pagesRead: 350,
    publisher: "Kyoto Craft Monograph",
    publishedYear: 2021,
    language: "English",
    isbn: "978-4-88321-112-9",
    rating: 4.9,
    reviewCount: 420,
    genres: ["Architecture", "Craftsmanship", "Japanese Design", "Art"],
    description: "An intricate study of joinery without nails, natural timber seasoning, and how traditional Japanese woodworking influences contemporary minimalist interiors worldwide.",
    status: "completed",
    finishedDate: "2026-06-14",
    favorite: true,
    progress: 100,
    lastOpened: "Jun 14, 2026",
    quote: "When two pieces of cedar interlock perfectly without glue, they honor the spirit of the forest.",
    memoryCard: {
      quote: "When two pieces of cedar interlock perfectly without glue, they honor the spirit of the forest.",
      topTakeaway: "Joinery is not just structure; it is an act of artistic patience.",
      rating: 5,
      moodTag: "Inspiring & Tactile",
      finishedDate: "2026-06-14"
    },
    chapters: [],
    notes: [],
    highlights: [],
    comments: []
  },
  {
    id: "book-7",
    title: "Principles of Elegant Software Architecture",
    author: "Henrik Lindholm",
    authorId: "author-7",
    cover: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80",
    spineColor: "#1A252C",
    spineTextColor: "#85C1E9",
    thickness: 44,
    pages: 520,
    pagesRead: 130,
    publisher: "Nordic Tech Press",
    publishedYear: 2025,
    language: "English",
    isbn: "978-1-4920-5630-0",
    rating: 4.85,
    reviewCount: 290,
    genres: ["Programming", "Software Design", "Computer Science"],
    description: "Building resilient, maintainable, and aesthetically clean distributed systems inspired by physical architectural principles.",
    status: "paused",
    favorite: false,
    progress: 25,
    lastOpened: "2 weeks ago",
    chapters: [],
    notes: [],
    highlights: [],
    comments: []
  },
  {
    id: "book-8",
    title: "The Psychology of Dark Academia",
    author: "Dr. Genevieve Sterling",
    authorId: "author-8",
    cover: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80",
    spineColor: "#2C1B20",
    spineTextColor: "#D98880",
    thickness: 30,
    pages: 296,
    pagesRead: 0,
    publisher: "Cambridge Scholarly Review",
    publishedYear: 2024,
    language: "English",
    isbn: "978-0-521-88990-1",
    rating: 4.75,
    reviewCount: 165,
    genres: ["Dark Academia", "Psychology", "Cultural Studies", "Literature"],
    description: "An exploration of gothic nostalgia, intense intellectual obsessions, leather-bound libraries, and romantic scholarly ideals in modern subcultures.",
    status: "wishlist",
    priority: "medium",
    price: "$21.50",
    availability: "Available",
    readingOrder: 2,
    favorite: false,
    progress: 0,
    lastOpened: "Never",
    chapters: [],
    notes: [],
    highlights: [],
    comments: []
  }
];

export const sampleCollections: Collection[] = [
  {
    id: "col-1",
    name: "Scandinavian Interior Design & Architecture",
    description: "Timber, light, functional minimalism, and sanctuary spaces.",
    coverImage: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=800&q=80",
    bookIds: ["book-1", "book-6"],
    badgeColor: "#E0A96D",
    theme: "Soft Beige & Oak"
  },
  {
    id: "col-2",
    name: "Classic Philosophy & Stoic Meditations",
    description: "Timeless guidance for inner quietude and living with purpose.",
    coverImage: "https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=800&q=80",
    bookIds: ["book-3", "book-5"],
    badgeColor: "#4A3B32",
    theme: "Dark Walnut & Parchment"
  },
  {
    id: "col-3",
    name: "Dark Academia & Gothic Mystique",
    description: "Leather-bound libraries, rain on stained glass, and secret societies.",
    coverImage: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80",
    bookIds: ["book-2", "book-8"],
    badgeColor: "#2C1B20",
    theme: "Midnight Burgundy"
  },
  {
    id: "col-4",
    name: "Modern Craft & Systems Thinking",
    description: "Craftsmanship in wood, code, and cognitive architecture.",
    coverImage: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80",
    bookIds: ["book-4", "book-7"],
    badgeColor: "#1A252C",
    theme: "Slate & Ice Blue"
  }
];

export const sampleAchievements: Achievement[] = [
  {
    id: "ach-1",
    title: "100 Pages Read",
    description: "Read your first 100 pages in OpenBook.",
    iconName: "BookOpen",
    unlocked: true,
    unlockedDate: "May 12, 2026",
    progress: 100,
    totalNeeded: 100,
    category: "pages"
  },
  {
    id: "ach-2",
    title: "1,000 Pages Master",
    description: "Turned 1,000 pages in quiet focus.",
    iconName: "BookMarked",
    unlocked: true,
    unlockedDate: "Jul 10, 2026",
    progress: 1000,
    totalNeeded: 1000,
    category: "pages"
  },
  {
    id: "ach-3",
    title: "7 Day Streak",
    description: "Read every single day for 7 consecutive days.",
    iconName: "Flame",
    unlocked: true,
    unlockedDate: "Jul 25, 2026",
    progress: 7,
    totalNeeded: 7,
    category: "streak"
  },
  {
    id: "ach-4",
    title: "30 Day Sanctuary Streak",
    description: "Maintained a daily reading ritual for 30 consecutive days.",
    iconName: "Zap",
    unlocked: false,
    progress: 14,
    totalNeeded: 30,
    category: "streak"
  },
  {
    id: "ach-5",
    title: "First Critical Review",
    description: "Published an insightful review for a completed book.",
    iconName: "MessageSquare",
    unlocked: true,
    unlockedDate: "Jul 20, 2026",
    progress: 1,
    totalNeeded: 1,
    category: "reviews"
  },
  {
    id: "ach-6",
    title: "Book Collector",
    description: "Curated 10 or more books in your personal library.",
    iconName: "Library",
    unlocked: false,
    progress: 8,
    totalNeeded: 10,
    category: "collector"
  },
  {
    id: "ach-7",
    title: "Night Owl Reader",
    description: "Logged over 60 minutes of reading between 11:00 PM and 4:00 AM.",
    iconName: "Moon",
    unlocked: true,
    unlockedDate: "Jun 30, 2026",
    progress: 60,
    totalNeeded: 60,
    category: "special"
  },
  {
    id: "ach-8",
    title: "Weekend Bibliophile",
    description: "Completed 3 books during weekend reading sessions.",
    iconName: "Coffee",
    unlocked: false,
    progress: 2,
    totalNeeded: 3,
    category: "special"
  }
];

export const sampleQuotes: Quote[] = [
  {
    id: "q-1",
    text: "Silence is not the absence of sound, but the presence of room to breathe.",
    bookTitle: "The Architecture of Solitude",
    author: "Elena Rostova",
    category: "Architecture & Mind",
    addedDate: "Aug 1, 2026",
    likes: 84,
    isLiked: true
  },
  {
    id: "q-2",
    text: "Have patience with everything that remains unsolved in your heart and try to love the questions themselves.",
    bookTitle: "Letters to a Young Poet",
    author: "Rainer Maria Rilke",
    category: "Philosophy",
    addedDate: "Jul 28, 2026",
    likes: 192,
    isLiked: true
  },
  {
    id: "q-3",
    text: "The fjords keep no records, yet they remember every storm that ever broke upon their waters.",
    bookTitle: "Shadows in the Fjords",
    author: "Soren Kjaer",
    category: "Mystery",
    addedDate: "Jul 20, 2026",
    likes: 67
  },
  {
    id: "q-4",
    text: "When two pieces of cedar interlock perfectly without glue, they honor the spirit of the forest.",
    bookTitle: "Japanese Woodworking & Modern Spaces",
    author: "Kenji Takahashi",
    category: "Craftsmanship",
    addedDate: "Jun 14, 2026",
    likes: 110
  }
];

export const sampleAuthors: Author[] = [
  {
    id: "author-1",
    name: "Elena Rostova",
    portrait: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",
    bio: "Elena Rostova is a Swedish-Finnish architect and author whose essays on Nordic spatial minimalism and light have reshaped modern interior theory across Europe.",
    born: "1982 in Stockholm, Sweden",
    location: "Helsinki & Stockholm",
    notableWorks: ["The Architecture of Solitude", "Nordic Timber Monoliths", "Spaces of Reflection"],
    achievements: ["Nordic Literature Prize 2024", "RIBA Architectural Essay Medal"],
    timeline: [
      { year: "2006", event: "Graduated with Masters in Architecture from KTH Royal Institute of Technology" },
      { year: "2014", event: "Published first monographic study on timber stave constructions" },
      { year: "2023", event: "Released 'The Architecture of Solitude' to international acclaim" }
    ],
    relatedAuthorNames: ["Soren Kjaer", "Kenji Takahashi", "Rainer Maria Rilke"]
  },
  {
    id: "author-2",
    name: "Soren Kjaer",
    portrait: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80",
    bio: "Norwegian novelist known for atmospheric coastal mysteries that blend historic lore with deep psychological suspense.",
    born: "1975 in Bergen, Norway",
    location: "Bergen, Norway",
    notableWorks: ["Shadows in the Fjords", "The Polar Sentinel", "Whispers of Solvorn"],
    achievements: ["Glass Key Award Nominee", "Riverton Prize Winner"],
    timeline: [
      { year: "2002", event: "Debut crime novel voted best Nordic paperback" },
      { year: "2022", event: "'Shadows in the Fjords' topped European bestsellers list" }
    ],
    relatedAuthorNames: ["Elena Rostova", "Dr. Genevieve Sterling"]
  }
];

export const readingStatsMonthly = [
  { month: 'Jan', pages: 320, books: 2, hours: 18 },
  { month: 'Feb', pages: 410, books: 3, hours: 24 },
  { month: 'Mar', pages: 280, books: 1, hours: 15 },
  { month: 'Apr', pages: 530, books: 4, hours: 32 },
  { month: 'May', pages: 460, books: 3, hours: 28 },
  { month: 'Jun', pages: 620, books: 4, hours: 38 },
  { month: 'Jul', pages: 710, books: 5, hours: 42 },
  { month: 'Aug', pages: 284, books: 2, hours: 16 }
];

export const genreDistribution = [
  { name: 'Architecture & Design', value: 35, color: '#E0A96D' },
  { name: 'Philosophy', value: 25, color: '#4A3B32' },
  { name: 'Mystery & Fiction', value: 20, color: '#1B263B' },
  { name: 'Craft & Tech', value: 20, color: '#2D4030' }
];
