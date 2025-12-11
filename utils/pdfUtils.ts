// PDF.js with proper worker configuration for Vite
import * as pdfjsLib from 'pdfjs-dist';

// Use CDN worker that matches the installed version
const PDFJS_VERSION = '5.4.449'; // Match your installed version
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;

/**
 * Extract text content from a PDF file
 */
export const extractTextFromPDF = async (file: File): Promise<string> => {
    try {
        console.log('Starting PDF extraction for:', file.name);

        const arrayBuffer = await file.arrayBuffer();
        console.log('File loaded, size:', arrayBuffer.byteLength);

        const loadingTask = pdfjsLib.getDocument({
            data: arrayBuffer,
            useSystemFonts: true
        });

        const pdf = await loadingTask.promise;
        console.log('PDF loaded, pages:', pdf.numPages);

        let fullText = '';

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            try {
                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();

                const pageText = textContent.items
                    .filter((item: any) => item.str && item.str.trim())
                    .map((item: any) => item.str)
                    .join(' ');

                if (pageText.trim()) {
                    fullText += `\n--- الصفحة ${pageNum} ---\n${pageText}\n`;
                }

                console.log(`Page ${pageNum}/${pdf.numPages} extracted`);
            } catch (pageError) {
                console.warn(`Error on page ${pageNum}:`, pageError);
                fullText += `\n--- الصفحة ${pageNum} (خطأ في القراءة) ---\n`;
            }
        }

        if (!fullText.trim()) {
            throw new Error('لم يتم العثور على نص في ملف PDF. قد يكون الملف ممسوحاً ضوئياً (صور).');
        }

        console.log('Extraction complete, total chars:', fullText.length);
        return fullText.trim();
    } catch (error: any) {
        console.error('PDF extraction error:', error);

        // More specific error messages
        if (error.message?.includes('Invalid PDF')) {
            throw new Error('ملف PDF غير صالح أو تالف');
        }
        if (error.message?.includes('password')) {
            throw new Error('ملف PDF محمي بكلمة مرور');
        }
        if (error.message?.includes('لم يتم العثور')) {
            throw error;
        }

        throw new Error(`فشل استخراج النص: ${error.message || 'خطأ غير معروف'}`);
    }
};

/**
 * Get PDF metadata (page count, etc.)
 */
export const getPDFInfo = async (file: File): Promise<{ pageCount: number }> => {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        return {
            pageCount: pdf.numPages
        };
    } catch (error) {
        console.error('Error getting PDF info:', error);
        throw new Error('فشل قراءة معلومات ملف PDF');
    }
};
