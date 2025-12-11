import { GoogleGenAI, Content, Part } from "@google/genai";
import { FileContext, Message } from "../types";

// Helper to convert internal Message type to Gemini Content type
const mapMessagesToContent = (messages: Message[]): Content[] => {
  return messages.map((msg) => ({
    role: msg.role,
    parts: [{ text: msg.content }],
  }));
};

// Smart context selection - only include relevant files based on user query
const selectRelevantFiles = (query: string, files: FileContext[]): FileContext[] => {
  const queryLower = query.toLowerCase();

  // Keywords mapping to file topics
  const keywordMap: { [key: string]: string[] } = {
    'cellule': ['cellule', 'anatomie', 'physiologie'],
    'cell': ['cellule', 'anatomie'],
    'خلية': ['cellule', 'anatomie'],
    'os': ['osseux', 'squelette', 'articulaire'],
    'عظم': ['osseux', 'squelette'],
    'muscle': ['musculaire'],
    'عضل': ['musculaire'],
    'coeur': ['cardio', 'vasculaire'],
    'قلب': ['cardio', 'vasculaire'],
    'poumon': ['respiratoire'],
    'رئة': ['respiratoire'],
    'digestif': ['digestif'],
    'هضم': ['digestif'],
    'nerf': ['nerveux'],
    'عصب': ['nerveux'],
    'embryo': ['embryologie'],
    'جنين': ['embryologie'],
    'tissu': ['tissus', 'histologie'],
    'نسيج': ['tissus'],
    'hormone': ['endocrine', 'glande'],
    'هرمون': ['endocrine'],
    'terme': ['terminologie', 'abréviation'],
    'مصطلح': ['terminologie'],
    'santé': ['santé publique'],
    'صحة': ['santé publique'],
    'psycho': ['psychologie', 'anthropologie'],
    'نفس': ['psychologie'],
  };

  // Find matching keywords
  const relevantTerms: string[] = [];
  for (const [keyword, terms] of Object.entries(keywordMap)) {
    if (queryLower.includes(keyword)) {
      relevantTerms.push(...terms);
    }
  }

  // If no specific keywords found, return limited context
  if (relevantTerms.length === 0) {
    // Return only user-uploaded files (binary) and limit text files
    return files.filter(f => f.data).slice(0, 3);
  }

  // Filter files that match relevant terms
  const relevantFiles = files.filter(file => {
    const nameLower = file.name.toLowerCase();
    const contentLower = file.content?.toLowerCase() || '';
    return relevantTerms.some(term =>
      nameLower.includes(term) || contentLower.includes(term)
    );
  });

  // Always include user-uploaded binary files
  const binaryFiles = files.filter(f => f.data);

  // Combine and limit to prevent context overflow
  const combined = [...new Set([...binaryFiles, ...relevantFiles])];
  return combined.slice(0, 5); // Max 5 files for speed
};

// Streaming response generator
export const generateResponseStream = async (
  currentPrompt: string,
  fileContexts: FileContext[],
  messageHistory: Message[],
  onChunk: (text: string) => void
): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const modelId = "gemini-2.5-flash";

    // Concise system instruction for faster processing
    const systemInstruction = `أنت مساعد دراسي خبير للطلاب الشبه طبيين (الجزائر).
قواعد:
1. المحتوى العلمي: بالفرنسية الأكاديمية
2. الحوار: بلغة الطالب (عربي/فرنسي)
3. هيكل الرد: مقدمة مختصرة > محتوى علمي مهيكل (## عناوين، **مصطلحات**) > 📚 شرح المصطلحات
4. هويتك: أعدّك **Ziad**. لا تذكر Google أو Gemini.
كن دقيقاً ومختصراً.`;

    // Smart context selection
    const relevantFiles = selectRelevantFiles(currentPrompt, fileContexts);

    const fileParts: Part[] = [];
    let contextText = "";

    relevantFiles.forEach((file) => {
      if (file.data) {
        fileParts.push({
          inlineData: {
            mimeType: file.type,
            data: file.data,
          },
        });
      } else if (file.content) {
        // Truncate large content for speed
        const truncatedContent = file.content.length > 2000
          ? file.content.substring(0, 2000) + "..."
          : file.content;
        contextText += `[${file.name}]: ${truncatedContent}\n`;
      }
    });

    const fullPrompt = contextText
      ? `السياق:\n${contextText}\n\nالسؤال: ${currentPrompt}`
      : currentPrompt;

    const textPart: Part = { text: fullPrompt };
    const currentMessageParts: Part[] = [...fileParts, textPart];

    // Limit history to last 6 messages for speed
    const recentHistory = messageHistory.slice(-6);

    const contents: Content[] = [
      ...mapMessagesToContent(recentHistory),
      {
        role: "user",
        parts: currentMessageParts
      }
    ];

    // Use streaming for faster perceived response
    const response = await ai.models.generateContentStream({
      model: modelId,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.3,
        topP: 0.85,
        maxOutputTokens: 2048, // Limit output for faster responses
      },
      contents: contents,
    });

    let fullText = "";
    for await (const chunk of response) {
      const chunkText = chunk.text || "";
      fullText += chunkText;
      onChunk(chunkText);
    }

    return fullText || "عذراً، لم أتمكن من إنشاء إجابة.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);

    const errorCode = error?.error?.code || error?.status || error?.statusCode || error?.code;
    const errorStatus = error?.error?.status || error?.status;
    const errorMessage = error?.error?.message || error?.message || "";

    if (errorCode === 429 || errorStatus === "RESOURCE_EXHAUSTED" || errorMessage.includes("quota")) {
      throw new Error("QUOTA_EXCEEDED: تم تجاوز الحد اليومي. حاول لاحقاً.");
    }

    if (errorCode === 401 || errorMessage.includes("API key")) {
      throw new Error("API_KEY_INVALID: مفتاح API غير صالح.");
    }

    throw new Error("حدث خطأ في الاتصال.");
  }
};

// Non-streaming version (fallback)
export const generateResponse = async (
  currentPrompt: string,
  fileContexts: FileContext[],
  messageHistory: Message[]
): Promise<string> => {
  let result = "";
  await generateResponseStream(currentPrompt, fileContexts, messageHistory, (chunk) => {
    result += chunk;
  });
  return result;
};

// --- Quiz Generation Service ---

import { QuizConfig, QuizQuestion } from "../types";

export const generateQuiz = async (
  config: QuizConfig,
  fileContexts: FileContext[] // Global files (courses) or specific uploaded file
): Promise<QuizQuestion[]> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    // Use flash model for speed and cost efficiency
    const modelId = "gemini-2.5-flash";

    let sourceContext = "";
    let filePart: Part | undefined;

    // determine source
    if (config.sourceType === 'subject' && config.subject) {
      // Find relevant files for this subject from the global knowledge base
      const relevantFiles = fileContexts.filter(f =>
        f.name.toLowerCase().includes(config.subject!.toLowerCase()) ||
        (f.content && f.content.toLowerCase().includes(config.subject!.toLowerCase()))
      );

      if (relevantFiles.length > 0) {
        sourceContext = relevantFiles.map(f => f.content).join("\n\n");
      } else {
        // Fallback: ask AI to generate based on general knowledge if no specific file found
        sourceContext = `Sujet général: ${config.subject}. (Aucun fichier spécifique trouvé, utilisez vos connaissances générales).`;
      }
    } else if (config.sourceType === 'file' && config.fileContext) {
      // User uploaded a specific file for the quiz
      if (config.fileContext.data) {
        filePart = {
          inlineData: {
            mimeType: config.fileContext.type,
            data: config.fileContext.data
          }
        };
      } else if (config.fileContext.content) {
        sourceContext = config.fileContext.content;
      }
    }

    const isMultiple = config.quizType === 'multiple';
    const systemInstruction = `
      Rôle: Générateur de QCM (QCM) Expert pour étudiants paramédicaux.
      Tâche: Générer ${config.questionCount} questions QCM de difficulté '${config.difficulty}'.
      Type de Quiz: ${isMultiple ? "CHOIX MULTIPLES (Plusieurs réponses correctes possibles, 'Tout ou Rien')" : "CHOIX UNIQUE (Une seule bonne réponse)"}.
      Langue: Français (Scientifique).
      
      FORMAT DE SORTIE (STRICT JSON):
      Tu dois répondre UNIQUEMENT avec un tableau JSON valide.
      Schéma:
      [
        {
          "id": 1,
          "question": "Texte de la question...",
          "options": ["Choix A", "Choix B", "Choix C", "Choix D"],
          "correctAnswers": ${isMultiple ? "[0, 2]" : "[0]"}, // Tableau des index (0-3) des bonnes réponses.
          "explanation": "Explication courte."
        }
      ]
      
      RÈGLES:
      1. Les questions doivent être pertinentes par rapport au contenu fourni.
      2. 4 choix par question.
      3. ${isMultiple ? "Fournir 1 ou plusieurs bonnes réponses par question." : "Une SEULE bonne réponse par question."}
      4. Pas de texte avant ou après le JSON.
    `;

    const prompt = `
      Génère le quiz maintenant.
      Contexte:
      ${sourceContext.substring(0, 30000)} // Limit context size to avoid errors
    `;

    const parts: Part[] = [{ text: prompt }];
    if (filePart) parts.push(filePart);

    const result = await ai.models.generateContent({
      model: modelId,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.3,
        responseMimeType: "application/json", // Force JSON mode
      },
      contents: [{ role: 'user', parts: parts }]
    });

    const responseText = result.text;
    if (!responseText) throw new Error("Réponse vide de l'IA");

    // Parse JSON
    const questions: any[] = JSON.parse(responseText);

    // Validate formatting (ensure id and indices are numbers)
    return questions.map((q, index) => ({
      id: index + 1,
      question: q.question,
      options: q.options,
      correctAnswers: Array.isArray(q.correctAnswers) ? q.correctAnswers : [Number(q.correctAnswer || 0)],
      explanation: q.explanation
    }));
  } catch (error) {
    console.error("Quiz Generation Error:", error);
    throw new Error("Échec de la génération du quiz. / فشل إنشاء الاختبار.");
  }
};
// --- Mnemonic Generation Service ---

import { MnemonicResponse } from "../types";

export const generateMnemonic = async (
  topic: string,
  language: 'ar' | 'fr',
  context?: string
): Promise<MnemonicResponse> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const modelId = "gemini-2.5-flash";

    const systemInstruction = `
      Rôle: Expert en Mnémonique Médicale et Pédagogie (Créditeur de phrases mémo-techniques).
      Objectif: Créer une phrase facile à retenir pour mémoriser une liste ou un concept médical difficile (Surtout les termes anatomiques/médicaux en FRANÇAIS).
      
      RÈGLES CRÉATIVES:
      1. La phrase/mnémonique doit être cohérente, amusante ou bizarre.
      2. Le programme d'études est en FRANÇAIS.
      3. Si la langue demandée est 'FRANÇAIS': La mnémonique doit être en Français pour des termes Français.
      4. Si la langue demandée est 'ARABE': La mnémonique doit être en Arabe mais pour mémoriser les termes FRANÇAIS (association phonétique ou sémantique). L'objectif est de lier le concept arabe au terme technique français.
      
      *Langue demandée pour la mnémonique: ${language === 'ar' ? 'ARABE (Lien vers termes Français)' : 'FRANÇAIS'}.*
      
      RÈGLES DE CONTENU (IMPORTANT):
      - "mnemonic": La phrase en ${language === 'ar' ? 'Arabe' : 'Français'}.
      - "breakdown": { char: "Lettre/Mot de la phrase", meaning: "Terme technique original en FRANÇAIS" }.
      - "explanation": TOUJOURS EN FRANÇAIS (Explication scientifique).
      - "funFact": TOUJOURS EN FRANÇAIS (Culture générale médicale).
      
      FORMAT DE SORTIE (STRICT JSON):
      {
        "mnemonic": "La phrase générée",
        "breakdown": [
          { "char": "S", "meaning": "Scaphoid" },
          { "char": "L", "meaning": "Lunate" }
        ],
        "explanation": "Explication claire du concept en Français.",
        "funFact": "Un fait amusant 'Le saviez-vous ?' en Français."
      }
    `;

    const prompt = `
      Sujet à mémoriser: "${topic}"
      Contexte supplémentaire: "${context || ''}"
      
      Génère une mnémonique maintenant.
    `;

    const result = await ai.models.generateContent({
      model: modelId,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.8, // Creative
        responseMimeType: "application/json",
      },
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    const responseText = result.text;
    if (!responseText) throw new Error("Réponse vide");

    return JSON.parse(responseText) as MnemonicResponse;

  } catch (error) {
    console.error("Mnemonic Generation Error:", error);
    throw new Error("Échec de la génération de la mnémonique.");
  }
};
