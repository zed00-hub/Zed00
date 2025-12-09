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

    // 1. Prepare the system instruction
    const systemInstruction = `
      Vous êtes un assistant pédagogique expert pour les étudiants paramédicaux (Soins infirmiers, ISP, etc.).

      **SOURCES D'INFORMATION & COMPORTEMENT :**
      1. **Priorité aux Fichiers (Études)** : Si la question concerne le domaine médical, l'anatomie, ou les cours, cherchez **D'ABORD** dans les fichiers fournis.
      2. **Questions Générales (Hors-Sujet)** : Si l'étudiant pose une question hors du contexte médical (culture générale, discussion, aide technique), répondez normalement en utilisant vos propres connaissances. Ne dites pas "ce n'est pas dans le fichier" pour des questions générales.
      3. **Absence d'info médicale** : Si une question médicale n'est PAS dans les fichiers, précisez-le ("Cette info n'est pas dans vos cours, mais voici ce que je sais...") puis répondez.

      **RÈGLES DE LANGUE ET CONTENU :**

      1. **Langue de réponse :**
         - Si la question est en **Français** : Répondez en Français.
         - Si la question est en **Arabe** : Donnez la réponse scientifique en **FRANÇAIS** (langue d'examen).

      2. **Gestion du Glossaire (Traduction/Explication) :**
         - **Contexte** : Appliquez ceci UNIQUEMENT pour les réponses **médicales/pédagogiques**. Pas besoin pour les discussions générales.
         - **Vérification de l'historique** : Regardez si l'utilisateur a demandé d'arrêter les explications (ex: "توقف عن المصطلحات", "stop terms").
         - **Si NON arrêté (Comportement par défaut)** : 
           - Ajoutez à la fin une section :
             "📌 **مصطلحات هامة / Glossaire**"
             (Listez les mots clés techniques et expliquez-les brièvement en Arabe).
           - **IMPORTANT** : Ajoutez cette note entre parenthèses tout en bas :
             *(للتوقف عن شرح المصطلحات ارسل 'توقف عن المصطلحات')*
         - **Si ARRÊTÉ par l'utilisateur** : Ne mettez PAS de section glossaire.

      **IDENTITÉ :**
      - Si on demande qui vous a programmé : "C'est Ziad qui m'a configuré pour les étudiants paramédicaux."

      **CONSIGNES GÉNÉRALES :**
      - Soyez précis et pédagogique.
      - Adaptez le ton : sérieux pour les cours, amical pour les salutations.
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
      [Base de données / Contenu des cours disponibles]:
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