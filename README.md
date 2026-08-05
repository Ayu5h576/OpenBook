# OpenBook

> An AI-powered reading platform that transforms how you discover, read, and connect with books through immersive 3D visualizations and intelligent recommendations.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-v20+-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8+-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)

## 📚 About OpenBook

OpenBook is a next-generation reading platform that leverages AI to create a personalized and engaging reading experience. From interactive 3D bookshelves to AI-powered recommendations, reading compass navigation, and community features, OpenBook reimagines how readers discover and engage with literature.

The platform combines stunning visual design with intelligent algorithms to provide a unique digital reading companion experience.

## ✨ Key Features

- **Interactive 3D Bookshelf**: Immersive 3D visualization of your book collection
- **Reading Compass**: AI-powered book recommendations based on your preferences
- **Wishlist Galaxy**: Visual wishlist with interactive constellation-style UI
- **Book DNA**: Detailed analysis and visualization of book characteristics
- **Reading Room**: Distraction-free reading environment
- **Smart Planner**: Intelligent reading schedule and goal tracking
- **Book Memories**: Track quotes, highlights, and personal notes
- **Quote Wall**: Beautiful quote collections and sharing
- **Smart Collections**: Organize and categorize your books intelligently
- **Community Features**: Connect with readers and authors
- **Achievements**: Gamified reading milestones and badges
- **Advanced Statistics**: Reading analytics and insights
- **Audio Synthesis**: Enhanced user experience with dynamic audio

## 🛠️ Tech Stack

### Frontend
- **React 19**: Modern UI framework with latest features
- **TypeScript 5.8**: Type-safe development
- **Vite 6**: Lightning-fast build tool and dev server
- **Tailwind CSS 4**: Utility-first CSS framework
- **Motion**: Smooth animations and transitions
- **Recharts 3**: Data visualization library
- **Lucide React**: Beautiful icon library

### Backend & Runtime
- **Node.js**: JavaScript runtime
- **Express.js**: Web application framework
- **esbuild**: Ultra-fast JavaScript bundler

### APIs & Services
- **Google Gemini AI**: AI-powered features and recommendations

### Development Tools
- **TSX**: TypeScript execution and transpilation
- **Autoprefixer**: CSS vendor prefixing
- **Tailwind CSS Vite Plugin**: Optimized Tailwind integration

## 📁 Project Architecture

```
openbook/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── BookCard3D.tsx
│   │   ├── InteractiveBookshelf3D.tsx
│   │   ├── ReadingCompass.tsx
│   │   ├── WishlistGalaxy.tsx
│   │   ├── BookDNA.tsx
│   │   ├── BookMemories.tsx
│   │   ├── QuoteWall.tsx
│   │   ├── SmartPlanner.tsx
│   │   ├── Navbar.tsx
│   │   ├── Sidebar.tsx
│   │   └── RightSidebar.tsx
│   ├── views/               # Page-level components
│   │   ├── HomeView.tsx
│   │   ├── LibraryView.tsx
│   │   ├── BookDetailView.tsx
│   │   ├── ExploreView.tsx
│   │   ├── WishlistView.tsx
│   │   ├── CollectionsView.tsx
│   │   ├── ReaderView.tsx
│   │   ├── CommunityView.tsx
│   │   ├── AuthorView.tsx
│   │   ├── StatisticsView.tsx
│   │   ├── AchievementsView.tsx
│   │   ├── SettingsView.tsx
│   │   ├── AuthView.tsx
│   │   └── LandingView.tsx
│   ├── data/                # Mock data and seed data
│   │   └── mockData.ts
│   ├── utils/               # Utility functions
│   │   └── audioSynth.ts
│   ├── types.ts             # TypeScript type definitions
│   ├── App.tsx              # Root application component
│   ├── main.tsx             # Application entry point
│   └── index.css            # Global styles
├── public/                  # Static assets
├── server.ts                # Express server configuration
├── vite.config.ts           # Vite configuration
├── tsconfig.json            # TypeScript configuration
├── tailwind.config.js       # Tailwind CSS configuration
├── package.json             # Project dependencies
├── .env.example             # Environment variables template
├── .gitignore               # Git ignore rules
├── README.md                # This file
└── LICENSE                  # MIT License
```

## 📸 Screenshots

> [Screenshots section placeholder - Add screenshots of key features]
- Landing page
- Interactive 3D bookshelf
- Reading compass interface
- Book detail view
- Community features

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v20 or higher ([Download](https://nodejs.org/))
- **npm** or **bun**: Package manager (comes with Node.js)
- **PostgreSQL**: v14 or higher ([Download](https://www.postgresql.org/download/))
- **Gemini API Key**: Get one from [Google AI Studio](https://ai.google.dev)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/openbook.git
   cd openbook
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   bun install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` and add your actual values:
   ```env
   DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/openbook?schema=public
   JWT_SECRET=generate-with-openssl-rand-base64-32
   GEMINI_API_KEY=your_gemini_api_key_here
   APP_URL=http://localhost:5173
   ```

### Database Setup

1. **Create the database**
   ```bash
   createdb -U postgres openbook
   ```
   Or from `psql`: `CREATE DATABASE openbook;`

2. **Set `DATABASE_URL`** in `.env` to point at it.

3. **Apply migrations**
   ```bash
   npm run db:migrate
   ```
   Creates the `users`, `profiles`, and `refresh_tokens` tables.

4. **Inspect the data** (optional)
   ```bash
   npm run db:studio
   ```

### Local Development Setup

1. **Start the development server**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:5173`

2. **Type checking**
   ```bash
   npm run lint
   ```
   Verify TypeScript compilation without errors.

3. **Build for production**
   ```bash
   npm run build
   ```
   Creates optimized production bundles in the `dist/` directory.

4. **Preview production build**
   ```bash
   npm run preview
   ```
   Serves the production build locally.

5. **Clean build artifacts**
   ```bash
   npm run clean
   ```
   Removes the `dist/` and `server.cjs` directories.

## 📝 Environment Variables

Create a `.env` file in the project root with the following variables:

```env
# PostgreSQL connection string (Required)
DATABASE_URL=postgresql://postgres:password@localhost:5432/openbook?schema=public

# Signs access tokens (Required)
# Generate with: openssl rand -base64 32
JWT_SECRET=your-long-random-secret

# Token lifetimes (Optional, defaults shown)
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL_DAYS=30

# Google Gemini API Key (Optional, enables AI features)
# Get your key from https://ai.google.dev
GEMINI_API_KEY=your_gemini_api_key_here

# Application URL (Required)
# The URL where the app is hosted
# For local development: http://localhost:5173
# For production: https://yourdomain.com
APP_URL=http://localhost:5173
```

See `.env.example` for the complete template.

## 📦 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot module replacement |
| `npm run build` | Build for production with Vite and esbuild |
| `npm run start` | Run the production build |
| `npm run preview` | Preview production build locally |
| `npm run clean` | Clean build artifacts and temporary files |
| `npm run lint` | Run TypeScript type checking |
| `npm run db:migrate` | Create and apply Prisma migrations |
| `npm run db:generate` | Regenerate the Prisma client |
| `npm run db:studio` | Browse the database in Prisma Studio |

## 🗂️ Folder Structure Details

### `/src/components`
Reusable UI components that handle specific features:
- Layout components (Navbar, Sidebar, RightSidebar)
- Feature components (BookCard3D, ReadingCompass, WishlistGalaxy, etc.)
- Helper components (Skeleton loaders, etc.)

### `/src/views`
Full-page view components that compose multiple components to create complete pages.

### `/src/data`
Mock data and seed data for development and testing. This will be replaced with backend API calls in production.

### `/src/utils`
Utility functions and helpers:
- `audioSynth.ts`: Audio synthesis and sound effects

### `/src/types.ts`
Centralized TypeScript type definitions for type safety across the project.

## 📖 Contributing

We welcome contributions from the community! Here's how you can help:

### Getting Started with Development

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit with descriptive messages (`git commit -m 'Add amazing feature'`)
5. Push to your branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

### Development Guidelines

- **Code Style**: Follow the existing code style and TypeScript conventions
- **Components**: Use functional components with hooks
- **Type Safety**: Always provide TypeScript types
- **Comments**: Add comments for complex logic (keep them brief and meaningful)
- **Testing**: Ensure your changes don't break existing functionality
- **Commit Messages**: Write clear, descriptive commit messages

### Pull Request Process

1. Update the README.md with any new features or changes
2. Ensure your code passes TypeScript checking (`npm run lint`)
3. Test your changes locally (`npm run dev`)
4. Request review from maintainers
5. Address feedback and discussion

### Reporting Issues

- Check existing issues first
- Provide clear description of the problem
- Include steps to reproduce
- Share environment details (Node version, OS, etc.)

## 🗺️ Future Roadmap

### Phase 1: Core Infrastructure (Current)
- [ ] Backend API development
- [ ] Database setup (Firebase/PostgreSQL)
- [ ] Authentication system
- [ ] User profile management

### Phase 2: Book Management & Reading
- [ ] Real book database integration
- [ ] PDF reader implementation
- [ ] Highlighting and notes system
- [ ] Reading progress sync

### Phase 3: AI & Intelligence
- [ ] Advanced recommendation engine
- [ ] Book analysis and categorization
- [ ] Personalized reading suggestions
- [ ] AI-powered insights and analytics

### Phase 4: Social & Community
- [ ] User profiles and followers
- [ ] Social sharing features
- [ ] Book club functionality
- [ ] Leaderboards and challenges

### Phase 5: Mobile & Expansion
- [ ] Mobile app (React Native)
- [ ] Offline reading support
- [ ] Audio book support
- [ ] E-book format support

### Phase 6: Advanced Features
- [ ] Advanced search and filters
- [ ] Custom themes and personalization
- [ ] Monetization features
- [ ] API for third-party integrations

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

The MIT License is a permissive open-source license that allows you to freely use, modify, and distribute this project with minimal restrictions.

## 🤝 Support & Community

- **Issues**: [GitHub Issues](https://github.com/yourusername/openbook/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/openbook/discussions)
- **Documentation**: [Wiki](https://github.com/yourusername/openbook/wiki)

## 🙏 Acknowledgments

- Google Gemini API for powering our AI features
- React and Vite communities for excellent tools
- All our contributors and community members

---

**Made with 📚 by the OpenBook Team**
