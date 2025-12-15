import { GoogleGenAI, Content, Part } from "@google/genai";
import { FileContext, Message } from "../types";
import { getKnowledgeForBot, getBotConfig, BotGlobalConfig } from "./botKnowledgeService";

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
const buildSystemInstruction = (settings: BotSettings, adminKnowledge: string = '', globalConfig?: BotGlobalConfig): string => {
  // Strategy: Custom Instruction (if any) + Restriction Rule + Interaction Style + Knowledge + Curriculum

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

  const knowledgeSection = adminKnowledge
    ? `\n⚠️ === INFORMATION IMPORTANTE (BASE DE CONNAISSANCES) ===\n${adminKnowledge}\nUtilisez ces informations en priorité pour répondre aux questions sur les spécialités, les lois, ou la recherche.\n=========================================\n`
    : '';

  // --- Handling Restrictions ---
  let restrictionRule = "";
  if (globalConfig?.restrictToStudy) {
    restrictionRule = `
⛔ RÈGLE STRICTE (RESTRICTION ACTIVÉE) :
Tu DOIS REFUSER de répondre à toute question qui n'est pas liée aux études médicales, paramédicales, ou au programme fourni.
Si l'utilisateur pose une question hors sujet (politique, sport, blagues, code, etc.), réponds poliment :
"Je suis spécialisé uniquement dans le domaine médical et paramédical. Je ne peux pas répondre à cette question."
Ne fais AUCUNE exception.`;
  }

  // --- Handling Interaction Style ---
  let styleInstruction = "";
  if (globalConfig?.interactionStyle && globalConfig.interactionStyle !== 'default') {
    const styles = {
      formal: "Adoptez un ton professionnel, académique et objectif. Soyez précis et concis.",
      friendly: "Soyez chaleureux, encourageant et utilisez des emojis. Agissez comme un collègue bienveillant.",
      motivational: "Soyez très énergique et motivant ! Encouragez l'étudiant à chaque étape : 'Tu vas y arriver !', 'Excellent effort !'.",
      coach: "Agissez comme un coach strict mais juste. Poussez l'étudiant à réfléchir par lui-même. Ne donnez pas la réponse immédiatement, guidez-le."
    };
    styleInstruction = `🎭 STYLE IMPOSÉ : ${styles[globalConfig.interactionStyle]}`;
  }

  // If custom instruction exists, use it as base but append restrictions/style/knowledge
  if (globalConfig?.systemInstruction && globalConfig.systemInstruction.trim().length > 0) {
    return `${globalConfig.systemInstruction}
      
${restrictionRule}

${styleInstruction}

${knowledgeSection}

${s1Subjects}`;
  }

  // Fallback to default logic if no custom instruction
  const lengthGuide = {
    short: 'اجعل إجاباتك مختصرة ومباشرة للنقاط الرئيسية فقط.',
    medium: 'قدم إجابات متوازنة: شاملة لكن دون إطالة غير ضرورية.',
    long: 'قدم شرحاً مفصلاً وشاملاً مع كل التفاصيل العلمية.'
  };

  const langGuide = {
    ar: 'تحدث بالعربية الفصحى مع المحتوى العلمي بالفرنسية.',
    fr: 'Répondez principalement en français académique.',
    mixed: 'امزج بين العربية للحوار والفرنسية للمحتوى العلمي. استثناء: لمادة "Législation/Éthique", استخدم العربية بالكامل (بما في ذلك المصطلحات).'
  };

  const toneGuide = styleInstruction || (settings.formalTone
    ? 'استخدم أسلوباً أكاديمياً رسمياً ومهنياً.'
    : 'استخدم أسلوباً ودوداً وبسيطاً للشرح.');

  const glossaryGuide = settings.includeGlossary
    ? 'أضف قسم "📚 شرح المصطلحات" في نهاية كل إجابة علمية.'
    : '';

  const examplesGuide = settings.includeExamples
    ? 'أضف أمثلة توضيحية عملية عند الحاجة.'
    : '';

  return `أنت مساعد دراسي خبير للطلاب الشبه طبيين (الجزائر/المغرب العربي).

${knowledgeSection}

${s1Subjects}

قواعد أساسية:
1. المحتوى العلمي: بالفرنسية الأكاديمية (كما في الجامعة).
2. ${langGuide[settings.preferredLanguage]}
3. ${lengthGuide[settings.responseLength]}
4. ${toneGuide}
${examplesGuide ? `5. ${examplesGuide}` : ''}

${glossaryGuide ? `6. ${glossaryGuide}` : ''}

${restrictionRule}

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
    const modelId = "gemini-2.5-flash"; // User specific model
    getKnowledgeForBot(),
      getBotConfig()
    ]);

const userSettings = settings || defaultSettings;
const systemInstructionContent = buildSystemInstruction(
  userSettings,
  adminKnowledge,
  botConfig || undefined
);

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
    temperature: botConfig?.temperature ?? 0.5,
    topP: 0.9,
    maxOutputTokens: userSettings.responseLength === 'short' ? 1000 : userSettings.responseLength === 'long' ? 8192 : 4000,
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
    const isLegislation = config.subject && (
      config.subject.toLowerCase().includes('législation') ||
      config.subject.toLowerCase().includes('legislation') ||
      config.subject.toLowerCase().includes('éthique')
    );

    const systemInstruction = `
      Rôle: Générateur de QCM (QCM) Expert pour étudiants paramédicaux.
      Tâche: Générer ${config.questionCount} questions QCM de difficulté '${config.difficulty}'.
      Type de Quiz: ${isMultiple ? "CHOIX MULTIPLES (Plusieurs réponses correctes possibles, 'Tout ou Rien')" : "CHOIX UNIQUE (Une seule bonne réponse)"}.
      Langue: ${isLegislation ? "ARABE (Pour la Législation/Éthique seulement)" : "Français (Scientifique)"}.
      
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
      ${isLegislation ? "5. IMPORTANT: Le contexte est 'Législation/Éthique', donc les questions, les choix et l'explication DOIVENT être en ARABE." : ""}
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

// --- Image Analysis for Admin Panel ---

export const analyzeImage = async (imageFile: File): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || "" });
    const modelId = "gemini-2.5-flash"; // Use generic model with vision capabilities

    // Convert file to base64
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(imageFile);
    });

    const result = await ai.models.generateContent({
      model: modelId,
      config: {
        systemInstruction: {
          role: 'system',
          parts: [{ text: "Tu es un assistant expert chargé d'analyser des images médicales ou éducatives pour une base de connaissances. Décris l'image en détail, en français, en te concentrant sur les informations utiles pour un étudiant paramédical." }]
        }
      },
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: imageFile.type,
                data: base64Data
              }
            },
            { text: "Analyse cette image en détail pour la base de connaissances." }
          ]
        }
      ]
    });

    return result.text || "Pas de description.";
  } catch (error) {
    console.error("Image Analysis Error:", error);
    throw new Error("Fermez l'analyse de l'image. / فشل تحليل الصورة.");
  }
};

// --- Checklist Generation Service (Chekiha Tool) ---

import { ChecklistResponse, ChecklistItem } from "../types";

export const generateChecklist = async (
  lessonContent: string,
  lessonTitle?: string
): Promise<ChecklistResponse> => {
  try {
    const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || "" });
    const modelId = "gemini-2.5-flash";

    const systemInstruction = `
      Rôle: Expert pédagogique spécialisé dans la création de check-lists d'étude pour étudiants paramédicaux.
      Objectif: Transformer un cours/leçon en une liste de tâches claire et actionnable pour aider l'étudiant à organiser sa révision.
      
      RÈGLES:
      1. Analyser le contenu fourni et identifier les concepts clés, chapitres, ou sujets principaux.
      2. Créer des tâches spécifiques et réalisables (pas trop générales).
      3. Organiser les tâches de manière logique (du simple au complexe).
      4. Ajouter des sous-tâches si nécessaire pour les concepts complexes.
      5. Estimer le temps total nécessaire pour compléter toutes les tâches.
      6. Fournir des conseils pratiques pour la révision.
      
      LANGUE: Répondre en Français avec termes médicaux appropriés.
      
      FORMAT DE SORTIE (STRICT JSON):
      {
        "title": "Titre du cours",
        "summary": "Résumé bref du contenu (1-2 phrases)",
        "items": [
          {
            "id": "1",
            "title": "Tâche principale",
            "description": "Description optionnelle plus détaillée",
            "isCompleted": false,
            "subItems": [
              {
                "id": "1.1",
                "title": "Sous-tâche",
                "isCompleted": false
              }
            ]
          }
        ],
        "estimatedTime": "2-3 heures",
        "tips": ["Conseil 1", "Conseil 2"]
      }
    `;

    const prompt = `
      Titre du cours: "${lessonTitle || 'Cours médical'}"
      
      Contenu à analyser:
      ${lessonContent.substring(0, 25000)}
      
      Génère une check-list d'étude complète maintenant.
    `;

    const result = await ai.models.generateContent({
      model: modelId,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.4,
        responseMimeType: "application/json",
      },
      contents: [{ role: 'user', parts: [{ text: prompt }] }]
    });

    const responseText = result.text;
    if (!responseText) throw new Error("Réponse vide");

    const parsed = JSON.parse(responseText);

    // Ensure all items have isCompleted: false
    const processItems = (items: any[]): ChecklistItem[] => {
      return items.map((item, idx) => ({
        id: item.id || `${idx + 1}`,
        title: item.title,
        description: item.description,
        isCompleted: false,
        subItems: item.subItems ? processItems(item.subItems) : undefined
      }));
    };

    return {
      title: parsed.title || lessonTitle || 'Check-list d\'étude',
      summary: parsed.summary || '',
      items: processItems(parsed.items || []),
      estimatedTime: parsed.estimatedTime,
      tips: parsed.tips
    };

  } catch (error) {
    console.error("Checklist Generation Error:", error);
    throw new Error("Échec de la génération de la check-list. / فشل إنشاء قائمة المهام.");
  }
};
