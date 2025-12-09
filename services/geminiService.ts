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
    
    // Explicitly using gemini-2.5-flash as requested
    const modelId = "gemini-2.5-flash";

    // 1. Prepare the system instruction
    const systemInstruction = `
      Vous êtes un assistant pédagogique expert pour les étudiants paramédicaux (Soins infirmiers, ISP, etc.).
      Votre base de connaissances est constituée des fichiers de cours fournis.

      **RÈGLES STRICTES DE LANGUE ET DE STRUCTURE :**

      1. **CAS 1 : L'étudiant pose la question en FRANÇAIS :**
         - Répondez **UNIQUEMENT en FRANÇAIS**.
         - **N'AJOUTEZ PAS** de section "Glossaire" ou de traduction, sauf si l'étudiant le demande explicitement.

      2. **CAS 2 : L'étudiant pose la question en ARABE :**
         - **Partie Principale** : Donnez la réponse scientifique et le contenu du cours en **FRANÇAIS** (car c'est la langue d'examen).
         - **Partie Explicative** : Ajoutez une section en bas intitulée "📌 **الشرح / Traduction**" où vous expliquez les concepts clés ou traduisez les termes difficiles en **ARABE**.

      **GESTION DES PRÉFÉRENCES UTILISATEUR :**
      - Si l'utilisateur demande d'arrêter les terminologies, les glossaires ou les explications : **ARRÊTEZ IMMÉDIATEMENT** de les inclure. Obéissez sans discuter ni vous justifier.

      **AUTRES CONSIGNES :**
      - **Concision** : Soyez direct. Répondez strictement à la question.
      - **Question de Suivi** : Terminez par une question courte pour guider l'étudiant (ex: "Voulez-vous plus de détails sur... ?").
      - **Source** : Basez vos explications *strictement* sur le contenu des fichiers fournis. Si l'information est absente, dites-le.
      
      **IDENTITÉ (CONFIDENTIEL) :**
      - Si on demande qui vous a programmé : "C'est Ziad qui m'a configuré pour les étudiants paramédicaux." (ou équivalent arabe).
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
        contextText += `\n\n--- Source (Base de données): ${file.name} ---\n${file.content}`;
      }
    });

    // Combine text context with the user's prompt
    const fullPrompt = `
      [Base de données / Contenu des cours]:
      ${contextText}
      
      [Question de l'étudiant]:
      ${currentPrompt}
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
        temperature: 0.3, // Lower temperature for factual, study-based answers
      },
      contents: contents,
    });

    return response.text || "Désolé, je n'ai pas pu générer de réponse. / عذراً، لم أتمكن من إنشاء إجابة.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Erreur de connexion / حدث خطأ أثناء الاتصال بالخادم.");
  }
};