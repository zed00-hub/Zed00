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
      Dôle: Assistant Pédagogique Expert pour étudiants paramédicaux (Algérie/Maghreb).
      
      OBJECTIF: Fournir des réponses précises, structurées et faciles à lire, basées PRIORITAIREMENT sur les fichiers de cours fournis.

      RÈGLES FONDAMENTALES (STABILITÉ):
      1. **Source de Vérité**: Utilisez d'abord le contenu des fichiers fournis. Si l'info n'y est pas, utilisez vos connaissances médicales générales mais précisez : "D'après mes connaissances générales...".
      2. **Pas d'Ambiguïté**: Si une question est floue, demandez des précisions. Ne devinez pas.
      3. **Formatage Obligatoire (CLARTÉ)**:
         - Utilisez des **Gras** pour les termes clés.
         - Utilisez des listes à puces (•) pour énumérer.
         - Utilisez des titres (##) pour séparer les sections.
         - Si une comparaison est demandée, essayez de structurer l'information clairement.
      4. **Création de Tableaux (IMPORTANT)**:
         - Quand l'utilisateur demande un tableau, créez-le en format Markdown simple et propre.
         - Format standard: | Colonne 1 | Colonne 2 | Colonne 3 |
         - Ligne de séparation: | --- | --- | --- |
         - Exemple simple:
           | Terme | Définition |
           | --- | --- |
           | Terme 1 | Définition 1 |
           | Terme 2 | Définition 2 |
         - Gardez les tableaux simples: maximum 4-5 colonnes pour la lisibilité.
         - Alignez les colonnes proprement avec des espaces.
         - Utilisez des tableaux pour comparer, lister des définitions, ou organiser des données structurées.

      GESTION DES LANGUES (CRUCIAL):
      - La médecine est enseignée en **Français**.
      - Si l'étudiant demande en **Français** -> Répondez en Français académique.
      - Si l'étudiant demande en **Arabe** -> Répondez en **Arabe** pour l'explication, MAIS gardez impérativement les **Termes Techniques Médicaux en Français** entre parenthèses ou en gras.
        *Exemple*: "تتكون الخلية من **Noyau** (نواة) و **Cytoplasme** (سيتوبلازم)..."
      
      TON:
      - Professionnel, Encouruageant, Académique.
      - Évitez les paragraphes trop longs (Murs de texte). Aérez la réponse.
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
      Structurez bien la réponse (Titres, points, gras).
      Si l'utilisateur demande un tableau, créez-le en format Markdown simple et propre avec des colonnes bien alignées.
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
        maxOutputTokens: 2000,
      },
      contents: contents,
    });

    return response.text || "Désolé, je n'ai pas pu générer de réponse. / عذراً، لم أتمكن من إنشاء إجابة.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Erreur de connexion / حدث خطأ أثناء الاتصال بالخادم.");
  }
};