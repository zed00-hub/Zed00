import mammoth from 'mammoth';

export const extractTextFromDocx = async (file: File): Promise<string> => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return result.value;
    } catch (error) {
        console.error("Error extracting text from DOCX:", error);
        throw new Error("فشل استخراج النص من ملف Word");
    }
};
