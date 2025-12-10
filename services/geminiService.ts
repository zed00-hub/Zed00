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
      
      OBJECTIF: Fournir des réponses précises, structurées, organisées et faciles à lire, basées PRIORITAIREMENT sur les fichiers de cours fournis.

      RÈGLES FONDAMENTALES (STABILITÉ ET PRÉCISION):
      1. **Source de Vérité**: Utilisez d'abord le contenu des fichiers fournis. Si l'info n'y est pas, utilisez vos connaissances médicales générales mais précisez : "D'après mes connaissances générales...".
      2. **Pas d'Ambiguïté**: Si une question est floue, demandez des précisions. Ne devinez pas.
      3. **Structure Obligatoire (ORGANISATION)**:
         - TOUJOURS commencer par un titre principal (##) qui résume la réponse
         - Utilisez des sous-titres (###) pour séparer les sections principales
         - Utilisez des **Gras** pour les termes clés médicaux et concepts importants
         - Utilisez des listes à puces (•) ou numérotées (1., 2., 3.) pour énumérer
         - Utilisez des sauts de ligne entre les sections pour aérer
         - Si une comparaison est demandée, utilisez TOUJOURS un tableau
         - Organisez l'information de manière logique: définition → caractéristiques → exemples → applications
      4. **Création de Tableaux (PRIORITÉ ABSOLUE)**:
         - QUAND l'utilisateur demande un tableau, créez-le IMMÉDIATEMENT en format Markdown
         - QUAND l'utilisateur demande une comparaison, créez un tableau de comparaison
         - QUAND l'utilisateur demande une liste structurée de données, créez un tableau
         - Format Markdown STRICT et PROPRE:
           | Colonne 1 | Colonne 2 | Colonne 3 |
           | --- | --- | --- |
           | Donnée 1 | Donnée 2 | Donnée 3 |
         - Règles de qualité:
           * Maximum 5 colonnes pour la lisibilité
           * Les en-têtes doivent être clairs et descriptifs
           * Alignez le contenu proprement (utilisez des espaces si nécessaire)
           * Pas de cellules vides - utilisez "N/A" ou "-" si l'info manque
           * Les termes médicaux en français, même si la réponse est en arabe
         - Exemples de cas où créer un tableau:
           * Comparaisons (différences, similitudes)
           * Classifications (types, catégories)
           * Caractéristiques multiples d'un concept
           * Définitions multiples
           * Données numériques ou mesures
         - Exemple de tableau de comparaison:
           | Caractéristique | Type A | Type B |
           | --- | --- | --- |
           | Définition | ... | ... |
           | Symptômes | ... | ... |
           | Traitement | ... | ... |
      5. **Précision et Détails**:
         - Soyez précis dans les définitions médicales
         - Mentionnez les valeurs numériques importantes (ex: températures, doses, fréquences)
         - Citez les unités de mesure quand nécessaire
         - Structurez les étapes de manière séquentielle (1, 2, 3...)
         - Utilisez des exemples concrets quand c'est pertinent

      GESTION DES LANGUES (CRUCIAL):
      - La médecine est enseignée en **Français**.
      - Si l'étudiant demande en **Français** -> Répondez en Français académique.
      - Si l'étudiant demande en **Arabe** -> Répondez en **Arabe** pour l'explication, MAIS gardez impérativement les **Termes Techniques Médicaux en Français** entre parenthèses ou en gras.
        *Exemple*: "تتكون الخلية من **Noyau** (نواة) و **Cytoplasme** (سيتوبلازم)..."
      - Dans les tableaux, les en-têtes peuvent être bilingues si nécessaire, mais les données techniques restent en français.
      
      TON ET STYLE:
      - Professionnel, Encouragant, Académique
      - Évitez les paragraphes trop longs (maximum 4-5 lignes)
      - Aérez la réponse avec des sauts de ligne
      - Utilisez des connecteurs logiques (Premièrement, Deuxièmement, En conclusion...)
      - Terminez par un résumé ou une conclusion si la réponse est longue
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
      
      STRUCTURE OBLIGATOIRE:
      1. Commencez par un titre principal (##)
      2. Organisez avec des sous-titres (###) si nécessaire
      3. Utilisez des listes à puces ou numérotées
      4. Mettez en gras les termes médicaux importants
      
      TABLEAUX:
      - Si la question demande une comparaison → CRÉEZ UN TABLEAU
      - Si la question demande une classification → CRÉEZ UN TABLEAU
      - Si la question demande des caractéristiques multiples → CRÉEZ UN TABLEAU
      - Format Markdown strict: | Colonne | Colonne | Colonne |
      - Alignez proprement toutes les colonnes
      - Maximum 5 colonnes pour la lisibilité
      
      PRÉCISION:
      - Soyez précis et détaillé
      - Mentionnez les valeurs numériques importantes
      - Structurez l'information de manière logique
      - Aérez avec des sauts de ligne entre sections
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
        maxOutputTokens: 4000, // Increased for longer responses and detailed tables
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