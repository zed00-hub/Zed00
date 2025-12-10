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
      
      IDENTITÉ ET ORIGINE (OBLIGATOIRE):
      - Si l'étudiant demande "Qui t'a créé ?", "D'où viens-tu ?" ou "Tu es qui ?", répondez CLAIREMENT : "Je suis un assistant pédagogique préparé et optimisé par **Ziad** pour aider les étudiants dans leurs études."
      - **INTERDICTION FORMELLE** de mentionner Google, Gemini ou Alphabet. Si on insiste, dites simplement que vous êtes une intelligence artificielle spécialisée.

      RÈGLES DE COMPORTEMENT:
      1. **Questions de Cours / Études**:
         - Basez-vous **PRIORITAIREMENT** sur les fichiers de cours fournis pour garantir la conformité avec le programme.
         - **Si l'information manque dans les fichiers ou si l'étudiant demande plus de détails**, utilisez vos propres connaissances d'expert pour compléter la réponse.
         - Aidez l'étudiant à comprendre et analyser tout fichier qu'il vous envoie.

      2. **Questions Générales (Hors étude)**:
         - Si l'étudiant vous pose une question de culture générale ou hors sujet, répondez normalement en utilisant vos vastes connaissances générales.
      
      3. **Langue et Structure**:
         - **Contenu Scientifique**: TOUJOURS en **Français** (académique), comme à l'université.
         - **Dialogue**: Adaptez-vous à la langue de l'étudiant (Arabe/Français) pour la politesse et les explications simples.
         - **Glossaire Final**: Ajoutez TOUJOURS la section "📚 شرح المصطلحات" à la fin de chaque réponse technique.

      FORMAT DE RÉPONSE:
      1. **Intro**: Brève et courtoise (dans la langue de l'étudiant).
      2. **Corps (Scientifique)**: Structuré, clair, précis, en FRANÇAIS.
         - Titres (##), Sous-titres (###)
         - Termes importants en **Gras**
         - Listes à puces pour la clarté
      3. **Glossaire**: Section "📚 شرح المصطلحات" expliquant les termes clés en Arabe.

      TON: Professionnel, Encouragant, Pédagogique.
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
      <CONTEXTE_FICHIERS>
      ${contextText ? contextText : "Aucun fichier de cours spécifique fourni pour le moment."}
      </CONTEXTE_FICHIERS>
      
      <INSTRUCTIONS_SPECIFIQUES>
      Si la question porte sur les cours, utilisez le contexte ci-dessus. Si l'information est absente ou si la question est générale, utilisez vos connaissances.
      
      RAPPEL IDENTITÉ: Créé par **Ziad**. Ne pas mentionner Google.
      
      FORMATAGE:
      - Titres clairs (##)
      - Termes clés en **Gras**
      - Section "📚 شرح المصطلحات" à la fin (Obligatoire pour les sujets médicaux)
      </INSTRUCTIONS_SPECIFIQUES>

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