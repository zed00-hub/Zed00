import { GoogleGenAI, Content, Part } from "@google/genai";
import { FileContext, Message } from "../types";

// Helper to convert internal Message type to Gemini Content type
const mapMessagesToContent = (messages: Message[]): Content[] => {
  return messages.map((msg) => ({
    role: msg.role,
    parts: [{ text: msg.content }],
  }));
};

export const generateResponse = async (
  currentPrompt: string,
  fileContexts: FileContext[],
  messageHistory: Message[]
): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // Use the standard stable flash model
    const modelId = "gemini-2.5-flash";

    // 1. Prepare the system instruction with strict formatting rules
    const systemInstruction = `
      Rôle: Assistant Pédagogique Expert pour étudiants paramédicaux (Algérie/Maghreb).
      
      OBJECTIF: Réponses précises, complètes et bien structurées, basées PRIORITAIREMENT sur les fichiers de cours fournis.

      RÈGLES FONDAMENTALES (STABILITÉ, PRÉCISION, COMPLÉTUDE):
      1. **Source de Vérité**: Utilisez d'abord le contenu des fichiers fournis. Si l'info manque, utilisez vos connaissances générales en le signalant.
      2. **Pas d'Ambiguïté**: Si la question est floue, demandez une précision courte.
      3. **Longueur Adaptative**:
         - Par défaut: réponse complète et exacte, sans حذف نقاط أساسية، حتى لو كانت طويلة.
         - إذا طلب المستخدم إجابة قصيرة → اجعلها مختصرة مع الحفاظ على الجوهر.
         - إذا طلب تفصيلاً أو مثالاً → قدّم التفاصيل الكاملة والأمثلة.
      4. **Structure (ORGANISATION)**:
         - Titre principal (##) qui résume l'idée clé
         - Sous-titres (###) pour les sections principales au besoin
         - **Gras** pour les termes médicaux importants
         - Listes à puces ou numérotées pour clarifier
         - Sauts de ligne pour aérer
      5. **Tableaux (SELON BESOIN)**:
         - Créez un tableau si: (a) l'utilisateur le demande explicitement, OU (b) la comparaison/classification serait plus claire en tableau.
         - Sinon, utilisez des puces/paragraphes.
         - Si tableau: Markdown propre, max 5 colonnes, en-têtes clairs, pas de cellules vides (utiliser "N/A"), termes médicaux en français.
      6. **Précision**:
         - Définitions exactes; mentionnez valeurs/mesures clés quand pertinentes.
         - Étapes numérotées si procédure.
         - Exemples pertinents si utiles à la compréhension.

      GESTION DES LANGUES (CRUCIAL - RÈGLE PRINCIPALE):
      - **المادة العلمية والمحتوى الطبي يجب أن يبقى دائماً بالفرنسية** (comme dans les cours universitaires algériens).
      - **التفاعل مع الطالب**: تكيّف مع لغة الطالب في الحوار والتوضيحات غير التقنية.
      
      FORMAT DE RÉPONSE OBLIGATOIRE:
      1. **CONTENU PRINCIPAL (بالفرنسية)**: 
         - Le contenu scientifique/médical DOIT être en français académique.
         - C'est le corps principal de la réponse, structuré comme un cours.
         - Tous les termes techniques, définitions, processus médicaux en FRANÇAIS.
      
      2. **SECTION "📚 شرح المصطلحات" (en bas de la réponse)**:
         - À LA FIN de chaque réponse, ajoutez une section séparée.
         - Listez les termes techniques français importants avec leur explication en arabe.
         - Format: **Terme français**: شرح بالعربية
         - Exemple:
           ---
           📚 **شرح المصطلحات:**
           - **Hémoglobine**: بروتين في كريات الدم الحمراء ينقل الأكسجين
           - **Leucocytes**: خلايا الدم البيضاء المسؤولة عن المناعة
           - **Thrombocytes**: الصفائح الدموية المسؤولة عن التخثر
           ---
      
      3. **DIALOGUE ADAPTATIF**:
         - Si l'étudiant pose une question en arabe → Répondez de manière amicale en arabe pour le dialogue ("أهلاً! سؤال ممتاز...") PUIS donnez le contenu scientifique en français, PUIS la section glossaire.
         - Si l'étudiant pose en français → Répondez entièrement en français avec la section glossaire en arabe à la fin.
      
      TON ET STYLE:
      - Professionnel, Encouragant, Académique
      - Courte, aérée, sans répétition inutile
      - Connecteurs logiques concis (Premièrement, Ensuite, Enfin)
      - تفاعل ودّي مع الطالب، شجّعه وادعمه
    `;

    // 2. Prepare content parts
    const fileParts: Part[] = [];
    let contextText = "";

    // Sort files so text context comes first or is aggregated
    fileContexts.forEach((file) => {
      if (file.data) {
        // It's a binary file (Image/PDF uploaded by user)
        fileParts.push({
          inlineData: {
            mimeType: file.type,
            data: file.data,
          },
        });
      } else if (file.content) {
        // It's a pre-loaded text module (Database)
        contextText += `\nSOURCE (${file.name}):\n${file.content}\n---FIN DE LA SOURCE---\n`;
      }
    });

    // Combine text context with the user's prompt using specific delimiters to avoid confusion
    const fullPrompt = `
      <CONTEXTE_COURS>
      ${contextText}
      </CONTEXTE_COURS>
      
      <INSTRUCTIONS_REPONSE>
      Répondez à la question suivante en vous basant sur le contexte ci-dessus.
      
      LONGUEUR ADAPTATIVE:
      - Par défaut: réponse complète et exacte، لا تحذف نقاطاً أساسية حتى لو طال النص.
      - إذا طُلِبَ الاختصار: قدّم نسخة مختصرة تحافظ على الجوهر.
      - إذا طُلِبَ التفصيل: قدّم مزيداً من الشرح والأمثلة.
      
      STRUCTURE:
      - Titre principal (##) concis.
      - Sous-titres (###) seulement si besoin.
      - Puces/numéros pour les points clés.
      - Termes médicaux importants en **gras**.
      
      TABLEAUX (OPTIONNELS):
      - Créez un tableau UNIQUEMENT si l'utilisateur le demande ou si une comparaison/classement serait moins clair sans tableau.
      - Sinon, utilisez des puces courtes.
      - Si tableau: Markdown propre, max 4 colonnes et lignes limitées, en-têtes clairs, pas de cellules vides (mettre "N/A").
      
      PRÉCISION:
      - Mentionnez valeurs/mesures clés quand pertinent.
      - Étapes numérotées si procédure.
      - Aérez avec des sauts de ligne courts.
      </INSTRUCTIONS_REPONSE>

      <QUESTION_ETUDIANT>
      ${currentPrompt}
      </QUESTION_ETUDIANT>
    `;

    const textPart: Part = { text: fullPrompt };

    // Combine binary parts (images/PDFs) with the text prompt
    const currentMessageParts: Part[] = [...fileParts, textPart];

    const contents: Content[] = [
      ...mapMessagesToContent(messageHistory),
      {
        role: "user",
        parts: currentMessageParts
      }
    ];

    const response = await ai.models.generateContent({
      model: modelId,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.2, // Lower temperature for more stable, factual answers
        topP: 0.8,
        // maxOutputTokens intentionally omitted to allow full-length answers when needed
      },
      contents: contents,
    });

    return response.text || "Désolé, je n'ai pas pu générer de réponse. / عذراً، لم أتمكن من إنشاء إجابة.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);

    // Extract error details - handle different error structures
    const errorCode = error?.error?.code || error?.status || error?.statusCode || error?.code;
    const errorStatus = error?.error?.status || error?.status;
    const errorMessage = error?.error?.message || error?.message || "";

    // Check for rate limit/quota exceeded error (429)
    // Also check for RESOURCE_EXHAUSTED status which indicates quota issues
    if (errorCode === 429 || errorStatus === "RESOURCE_EXHAUSTED" || errorMessage.includes("quota") || errorMessage.includes("Quota exceeded")) {
      const retryDelayMatch = errorMessage.match(/retry in ([\d.]+)s/i) || errorMessage.match(/retry in ([\d.]+) second/i);
      const retryDelay = retryDelayMatch ? Math.ceil(parseFloat(retryDelayMatch[1])) : null;

      let quotaMessage = "تم تجاوز الحد اليومي للطلبات (20 طلب في اليوم للمستوى المجاني).";
      if (retryDelay) {
        quotaMessage += ` يمكنك المحاولة مرة أخرى بعد ${retryDelay} ثانية.`;
      } else {
        quotaMessage += " يرجى المحاولة مرة أخرى لاحقاً أو غداً.";
      }

      throw new Error(`QUOTA_EXCEEDED: ${quotaMessage} / Limite quotidienne dépassée (20 requêtes/jour pour le niveau gratuit).${retryDelay ? ` Réessayez dans ${retryDelay} secondes.` : " Veuillez réessayer plus tard ou demain."}`);
    }

    // Check for API key errors
    if (errorCode === 401 || errorMessage.includes("API key") || errorMessage.includes("authentication")) {
      throw new Error("API_KEY_INVALID: مفتاح API غير صالح أو منتهي الصلاحية. / Clé API invalide ou expirée.");
    }

    // Generic error
    throw new Error("Erreur de connexion / حدث خطأ أثناء الاتصال بالخادم.");
  }
};