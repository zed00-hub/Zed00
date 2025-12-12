import { GoogleGenAI, Content, Part } from "@google/genai";
import { FileContext, Message } from "../types";
import { getKnowledgeForBot } from "./botKnowledgeService";

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
    // New Categories
    'loi': ['laws', 'legislation', 'juridique', 'règlement'],
    'droit': ['laws', 'legislation', 'juridique'],
    'قانون': ['laws', 'legislation', 'juridique'],
    'تشريع': ['laws', 'legislation', 'juridique'],
    'spécialité': ['specialties', 'paramédical'],
    'filière': ['specialties'],
    'تخصص': ['specialties'],
    'info': ['general_info'],
    'معلومات': ['general_info'],
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
    const categoryLower = file.category?.toLowerCase() || '';

    return relevantTerms.some(term =>
      nameLower.includes(term) ||
      contentLower.includes(term) ||
      categoryLower.includes(term) ||
      (file.category === term) // Direct category match
    );
  });

  // Always include user-uploaded binary files
  const binaryFiles = files.filter(f => f.data);

  // Combine and limit to prevent context overflow
  const combined = [...new Set([...binaryFiles, ...relevantFiles])];
  return combined.slice(0, 5); // Max 5 files for speed
};

// Settings type for bot customization
export interface BotSettings {
  responseLength: 'short' | 'medium' | 'long';
  preferredLanguage: 'ar' | 'fr' | 'mixed';
  includeGlossary: boolean;
  includeExamples: boolean;
  formalTone: boolean;
}

const defaultSettings: BotSettings = {
  responseLength: 'medium',
  preferredLanguage: 'mixed',
  includeGlossary: true,
  includeExamples: true,
  formalTone: true,
};

// Build dynamic system instruction based on settings
const buildSystemInstruction = (settings: BotSettings, adminKnowledge: string = ''): string => {
  const lengthGuide = {
    short: 'اجعل إجاباتك مختصرة ومباشرة للنقاط الرئيسية فقط.',
    medium: 'قدم إجابات متوازنة: شاملة لكن دون إطالة غير ضرورية.',
    long: 'قدم شرحاً مفصلاً وشاملاً مع كل التفاصيل العلمية.'
  };

  const langGuide = {
    ar: 'تحدث بالعربية الفصحى مع المحتوى العلمي بالفرنسية.',
    fr: 'Répondez principalement en français académique.',
    mixed: 'امزج بين العربية للحوار والفرنسية للمحتوى العلمي.'
  };

  const toneGuide = settings.formalTone
    ? 'استخدم أسلوباً أكاديمياً رسمياً ومهنياً.'
    : 'استخدم أسلوباً ودوداً وبسيطاً للشرح.';

  const glossaryGuide = settings.includeGlossary
    ? 'أضف قسم "📚 شرح المصطلحات" في نهاية كل إجابة علمية.'
    : '';

  const examplesGuide = settings.includeExamples
    ? 'أضف أمثلة توضيحية عملية عند الحاجة.'
    : '';

  // S1 Curriculum subjects
  const s1Subjects = `
Matières du Semestre 1 (S1) - Tronc Commun:
1. Anatomie-physiologie 🦴
2. Anthropologie/Psychologie/Psychosociologie 🧠
3. Hygiène hospitalière 🧹
4. Législation/Ethique professionnelle/Déontologie ⚖️
5. Santé publique/Démographie/Economie de santé 🏥
6. Secourisme 🚑
7. Les fondements de la profession paramédicale 👨‍⚕️
8. Remédiation linguistique/Techniques d'expression écrite et orale ✍️
9. Terminologie médicale 📝`;

  return `أنت مساعد دراسي خبير للطلاب الشبه طبيين (الجزائر/المغرب العربي).

${adminKnowledge ? `\n⚠️ === INFORMATION IMPORTANTE (BASE DE CONNAISSANCES) ===\n${adminKnowledge}\nUtilisez ces informations en priorité pour répondre aux questions sur les spécialités, les lois, ou la recherche.\n=========================================\n` : ''}

${s1Subjects}

قواعد أساسية:
1. المحتوى العلمي: بالفرنسية الأكاديمية (كما في الجامعة).
2. ${langGuide[settings.preferredLanguage]}
3. ${lengthGuide[settings.responseLength]}
4. ${toneGuide}
${examplesGuide ? `5. ${examplesGuide}` : ''}
${glossaryGuide ? `6. ${glossaryGuide}` : ''}

هيكل الرد:
- مقدمة مختصرة (بلغة الطالب)
- محتوى علمي مهيكل (## عناوين، **مصطلحات مهمة**)
${settings.includeGlossary ? '- 📚 شرح المصطلحات (بالعربية)' : ''}
- عند الحديث عن مواد S1، اقترح على الطالب اختبار نفسه: "💡 يمكنك اختبار معلوماتك في هذه المادة من قسم الاختبارات!"

هويتك: أعدّك **Ziad**. لا تذكر Google أو Gemini أبداً.`;
};

// Streaming response generator with settings
export const generateResponseStream = async (
  currentPrompt: string,
  fileContexts: FileContext[],
  messageHistory: Message[],
  onChunk: (text: string) => void,
  settings?: BotSettings
): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || "" });
    const modelId = "gemini-1.5-flash"; // Or keep consistent with previous versions

    // Fetch Admin Knowledge Base
    const adminKnowledge = await getKnowledgeForBot();

    const userSettings = settings || defaultSettings;
    const systemInstructionContent = buildSystemInstruction(userSettings, adminKnowledge);

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
        // Full content for scientific accuracy
        contextText += `\n[SOURCE: ${file.name}]\n${file.content}\n---\n`;
      }
    });

    const fullPrompt = contextText
      ? `<CONTEXTE>\n${contextText}</CONTEXTE>\n\n<QUESTION>\n${currentPrompt}\n</QUESTION>`
      : currentPrompt;

    const textPart: Part = { text: fullPrompt };
    const currentMessageParts: Part[] = [...fileParts, textPart];

    // Keep reasonable history
    const recentHistory = messageHistory.slice(-8);

    const contents: Content[] = [
      ...mapMessagesToContent(recentHistory),
      {
        role: "user",
        parts: currentMessageParts
      }
    ];

    // Use streaming - NO token limit for full scientific responses
    const response = await ai.models.generateContentStream({
      model: modelId,
      config: {
        systemInstruction: {
          role: 'system',
          parts: [{ text: systemInstructionContent }]
        },
        temperature: 0.5,
        topP: 0.9,
        maxOutputTokens: userSettings.responseLength === 'short' ? 500 : userSettings.responseLength === 'long' ? 2000 : 1000,
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
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || "" });
    // Use flash model for speed and cost efficiency
    const modelId = "gemini-1.5-flash";

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
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || "" });
    const modelId = "gemini-1.5-flash";

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
      - "breakdown": { char: "Lettre/Mot de la phrase", meaning: "Terme technique original STRICTEMENT EN FRANÇAIS" }.
      - "explanation": TOUJOURS EN FRANÇAIS (Explication scientifique). Il peut y avoir quelques mots en arabe entre parenthèses pour clarifier, mais le texte principal doit être en Français.
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

// --- Image Analysis Service ---
export const analyzeImage = async (
  base64Data: string,
  mimeType: string
): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || "" });
    const modelId = "gemini-1.5-flash";

    const systemInstruction = `
      Rôle: Expert en Imagerie Médicale et Analyse de Documents.
      Tâche: Analyser l'image fournie et extraire toutes les informations pertinentes pour une base de connaissances.
      
      Directives:
      1. Si c'est un schéma/diagramme médical : Décris-le en détail (anatomie, processus, annotations).
      2. Si c'est du texte scanner : Transcris le texte intégralement.
      3. Si c'est une photo clinique : Décris les signes visibles (sans diagnostic définitif).
      4. Langue : Français (Scientifique) avec terminologie précise.
      
      Format de sortie : Texte brut structuré, prêt à être ajouté à la base de connaissances.
    `;

    const result = await ai.models.generateContent({
      model: modelId,
      config: {
        systemInstruction: {
          role: 'system',
          parts: [{ text: systemInstruction }]
        },
      },
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Data
              }
            },
            { text: "Analyse cette image en détail pour la base de connaissances." }
          ]
        }
      ]
    });

    const responseText = result.text;
    if (!responseText) throw new Error("Réponse vide");

    return responseText;
  } catch (error) {
    console.error("Image Analysis Error:", error);
    throw new Error("Échec de l'analyse de l'image.");
  }
};
