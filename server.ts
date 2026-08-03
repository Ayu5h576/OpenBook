import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// API: AI Assistant Chat & Analysis
app.post("/api/ai/analyze", async (req, res) => {
  try {
    const { prompt, context, type } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        response: `[Offline Mode] Here is an insightful breakdown of "${type || 'your request'}":\n\n1. Core Theme: Explores human resilience and identity through rich atmospheric storytelling.\n2. Key Insight: Literature reflects our deepest unexamined desires and moral choices.\n3. Reading Advice: Read slowly with attention to pacing and character dialogue.`,
        isFallback: true
      });
    }

    let systemInstruction = "You are OpenBook's literary AI companion, a deeply knowledgeable, cultured, and articulate literary editor and reading mentor. Respond in elegant, clear, warm tone with well-structured markdown.";
    
    if (type === 'relationship_graph') {
      systemInstruction = "Analyze character relationships in the provided book context. Return a JSON object formatted as: { \"nodes\": [{\"id\": \"Name\", \"role\": \"Description\"}], \"links\": [{\"source\": \"Name\", \"target\": \"Name\", \"label\": \"Relationship\"}] }";
    } else if (type === 'summary') {
      systemInstruction = "Provide a high-level, elegant 3-part summary: 1. Executive Essence, 2. Key Takeaways (3 bullet points), 3. Ideal Reader Profile.";
    } else if (type === 'explain') {
      systemInstruction = "Explain this paragraph in clear, engaging terms. Highlight the literary devices, historical context, or psychological nuance.";
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: `${context ? `Book Context:\n${context}\n\n` : ''}User Query: ${prompt}`,
      config: {
        systemInstruction,
      },
    });

    res.json({ response: response.text });
  } catch (err: any) {
    console.error("Gemini Error:", err);
    res.status(500).json({ error: err.message || "Failed to generate AI response" });
  }
});

// API: Reading Compass (Mood-based recommendation)
app.post("/api/ai/compass", async (req, res) => {
  try {
    const { mood } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        recommendations: [
          {
            title: "The Shadow of the Wind",
            author: "Carlos Ruiz Zafón",
            genre: "Gothic Mystery",
            matchReason: "Matches your craving for atmospheric, atmospheric labyrinthine bookish mystery.",
            rating: 4.8
          },
          {
            title: "Norwegian Wood",
            author: "Haruki Murakami",
            genre: "Literary Fiction",
            matchReason: "Resonates with nostalgic, introspective Scandinavian-style quiet reflection.",
            rating: 4.7
          }
        ]
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: `Suggest 3 books based on this emotional/mood description: "${mood}". Return a JSON array of objects with keys: "title", "author", "genre", "matchReason", "rating".`,
      config: {
        responseMimeType: "application/json",
      },
    });

    try {
      const parsed = JSON.parse(response.text || '[]');
      res.json({ recommendations: parsed });
    } catch {
      res.json({ rawText: response.text });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Natural Language Search
app.post("/api/ai/search", async (req, res) => {
  try {
    const { query } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        suggestedGenres: ["Literary Fiction", "Philosophy", "Psychology"],
        searchTokens: [query],
        curatedNote: `Searching personal library for "${query}"`
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: `User searched for: "${query}". Analyze search intent and return a JSON object with: "intentKeywords": ["keyword1", "keyword2"], "recommendedGenres": ["Genre1"], "editorialInsight": "1 sentence describing what kind of books match this vibe".`,
      config: {
        responseMimeType: "application/json",
      },
    });

    res.json(JSON.parse(response.text || '{}'));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Gemini Personalized Library Recommendations
app.post("/api/ai/recommendations", async (req, res) => {
  try {
    const { userBooks, preferenceFocus } = req.body;
    const ai = getGeminiClient();

    const bookSummaries = (userBooks || []).map((b: any) => `- "${b.title}" by ${b.author} (Genres: ${b.genres?.join(', ')}, Status: ${b.status}, Favorite: ${b.favorite ? 'Yes' : 'No'}, Rating: ${b.rating || 'N/A'})`).join('\n');

    if (!ai) {
      return res.json({
        analysisSummary: "Your library reflects a deep taste for atmospheric, introspective fiction and Scandinavian interior aesthetics.",
        recommendations: [
          {
            id: "rec-1",
            title: "The Memory Police",
            author: "Yoko Ogawa",
            genre: "Dystopian Speculative",
            matchPercentage: 98,
            basedOnBook: "Klara and the Sun",
            personalizedSummary: "An exquisite, quiet exploration of memory and loss that mirrors the delicate melancholic prose of your favorite speculative works.",
            cover: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80",
            rating: 4.8,
            pages: 274
          },
          {
            id: "rec-2",
            title: "In Praise of Shadows",
            author: "Jun'ichirō Tanizaki",
            genre: "Design & Aesthetics",
            matchPercentage: 95,
            basedOnBook: "The Interior World of Nordic Light",
            personalizedSummary: "A classic essay on aesthetics, lighting, and architectural subtle textures that complements your interest in interior design philosophy.",
            cover: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=400&q=80",
            rating: 4.7,
            pages: 112
          },
          {
            id: "rec-3",
            title: "Kintsugi: The Art of Broken Pieces",
            author: "Céline Santini",
            genre: "Philosophy",
            matchPercentage: 92,
            basedOnBook: "Meditations",
            personalizedSummary: "Integrates stoic acceptance with Japanese aesthetic traditions, providing gentle reflection for quiet evening reading sessions.",
            cover: "https://images.unsplash.com/photo-1532012197267-da84d127e765?auto=format&fit=crop&w=400&q=80",
            rating: 4.6,
            pages: 240
          }
        ]
      });
    }

    const prompt = `Analyze this user's personal reading library:\n${bookSummaries}\n${preferenceFocus ? `Preference Focus: ${preferenceFocus}\n` : ''}

Generate 3-4 highly tailored book recommendations. Return a JSON object with:
"analysisSummary": "1-2 sentence overall analysis of user's literary taste",
"recommendations": [
  {
    "id": "rec-1",
    "title": "Book Title",
    "author": "Author Name",
    "genre": "Primary Genre",
    "matchPercentage": 95,
    "basedOnBook": "Title of book from user's library that inspired this recommendation",
    "personalizedSummary": "2-3 sentences explaining why this book is specifically recommended for this user based on their specific reading history and themes",
    "cover": "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80",
    "rating": 4.8,
    "pages": 300
  }
]`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are OpenBook's chief literary curator. Analyze reading patterns and recommend deeply resonant books with thoughtful personalized summaries.",
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (err: any) {
    console.error("Gemini Recommendations Error:", err);
    res.status(500).json({ error: err.message || "Failed to generate recommendations" });
  }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", app: "OpenBook" });
});

// Vite Middleware for dev or static serving for prod
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[OpenBook] Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
