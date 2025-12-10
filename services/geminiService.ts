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
      
      OBJECTIF: Réponses concises, précises et faciles à lire, basées PRIORITAIREMENT sur les fichiers de cours fournis.

      RÈGLES FONDAMENTALES (STABILITÉ, PRÉCISION, BRIÈVETÉ):
      1. **Source de Vérité**: Utilisez d'abord le contenu des fichiers fournis. Si l'info manque, utilisez vos connaissances générales en le signalant.
      2. **Pas d'Ambiguïté**: Si la question est floue, demandez une précision courte.
      3. **Brièveté**: Réponses courtes (3-7 phrases ou puces). Allez droit au but, pas de remplissage.
      4. **Structure (ORGANISATION)**:
         - Titre principal (##) qui résume l'idée clé
         - Sous-titres (###) seulement si nécessaire
         - **Gras** pour les termes médicaux importants
         - Listes à puces ou numérotées pour aller à l'essentiel
         - Sauts de ligne pour aérer, pas de longs paragraphes
      5. **Tableaux (SEULEMENT SI NÉCESSAIRE)**:
         - Créez un tableau uniquement si: (a) l'utilisateur le demande explicitement, OU (b) une comparaison/classification serait confuse sans tableau.
         - Sinon, privilégiez des puces courtes.
         - Si tableau: Markdown propre, max 4 colonnes, lignes limitées, en-têtes clairs, pas de cellules vides (utiliser "N/A"), termes médicaux en français.
      6. **Précision**:
         - Définitions exactes; mentionnez valeurs/mesures clés quand pertinentes.
         - Étapes numérotées si procédure.
         - Exemples courts uniquement si utiles.

      GESTION DES LANGUES (CRUCIAL):
      - La médecine est enseignée en **Français**.
      - Si l'étudiant demande en **Français** -> Répondez en Français académique.
      - Si l'étudiant demande en **Arabe** -> Répondez en **Arabe** pour l'explication, MAIS gardez les **Termes Techniques Médicaux en Français** entre parenthèses ou en gras.
        *Exemple*: "تتكون الخلية من **Noyau** (نواة) و **Cytoplasme** (سيتوبلازم)..."
      - Dans les tableaux, les en-têtes peuvent être bilingues si nécessaire, mais les données techniques restent en français.
      
      TON ET STYLE:
      - Professionnel, Encouragant, Académique
      - Courte, aérée, sans répétition inutile
      - Connecteurs logiques concis (Premièrement, Ensuite, Enfin)
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
      
      BRIÈVETÉ:
      - Réponse courte, focalisée sur l'essentiel (3-7 puces ou phrases).
      - Pas de remplissage, pas de répétitions.
      
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
        maxOutputTokens: 2000, // Limit length to keep replies concise and save tokens
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