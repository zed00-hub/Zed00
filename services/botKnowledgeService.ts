import { db } from './firebase';
import { collection, doc, setDoc, getDoc, getDocs, deleteDoc, query, Timestamp } from 'firebase/firestore';

// Knowledge categories
export const KNOWLEDGE_CATEGORIES = [
    { id: 'general_info', label: 'Informations Générales', labelAr: 'معلومات عامة', icon: '📚' },
    { id: 'specializations', label: 'Spécialisations', labelAr: 'التخصصات', icon: '🎓' },
    { id: 'exams_tips', label: 'Conseils Examens', labelAr: 'نصائح الامتحانات', icon: '📝' },
    { id: 'research', label: 'Recherches', labelAr: 'بحوث', icon: '🔬' },
    { id: 'laws', label: 'Lois & Règlements', labelAr: 'قوانين وتشريعات', icon: '⚖️' },
    { id: 'faq', label: 'FAQ', labelAr: 'أسئلة شائعة', icon: '❓' },
    { id: 'other', label: 'Autre', labelAr: 'أخرى', icon: '📎' }
];

export interface KnowledgeEntry {
    id: string;
    title: string;
    content: string;
    category: string;
    createdAt: number;
    updatedAt?: any; // Firestore Timestamp
}

// Save knowledge entry
export const saveKnowledgeEntry = async (entry: KnowledgeEntry) => {
    try {
        const entryRef = doc(db, 'bot_knowledge', entry.id);
        await setDoc(entryRef, {
            ...entry,
            updatedAt: Timestamp.now()
        }, { merge: true });
        console.log('Knowledge entry saved:', entry.id);
    } catch (error) {
        console.error('Error saving knowledge entry:', error);
        throw error;
    }
};

// Load all knowledge entries
export const loadKnowledgeEntries = async (): Promise<KnowledgeEntry[]> => {
    try {
        const knowledgeRef = collection(db, 'bot_knowledge');
        const q = query(knowledgeRef);
        const snapshot = await getDocs(q);

        const entries: KnowledgeEntry[] = [];
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            entries.push({
                id: data.id || docSnap.id,
                title: data.title,
                content: data.content,
                category: data.category,
                createdAt: data.createdAt || Date.now()
            });
        });

        // Sort by createdAt descending
        return entries.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
        console.error('Error loading knowledge entries:', error);
        return [];
    }
};

// Delete knowledge entry
export const deleteKnowledgeEntry = async (entryId: string) => {
    try {
        await deleteDoc(doc(db, 'bot_knowledge', entryId));
        console.log('Knowledge entry deleted:', entryId);
    } catch (error) {
        console.error('Error deleting knowledge entry:', error);
        throw error;
    }
};

// Get formatted knowledge for bot context
export const getKnowledgeForBot = async (): Promise<string> => {
    try {
        const entries = await loadKnowledgeEntries();
        if (entries.length === 0) return '';

        let context = '\n=== CONNAISSANCES ADMIN ===\n';

        // Group by category
        const grouped: { [key: string]: KnowledgeEntry[] } = {};
        entries.forEach(entry => {
            if (!grouped[entry.category]) {
                grouped[entry.category] = [];
            }
            grouped[entry.category].push(entry);
        });

        // Format each category
        for (const [catId, catEntries] of Object.entries(grouped)) {
            const cat = KNOWLEDGE_CATEGORIES.find(c => c.id === catId);
            context += `\n--- ${cat?.label || catId} ---\n`;
            catEntries.forEach(entry => {
                context += `\n[${entry.title}]\n${entry.content}\n`;
            });
        }

        return context;
    } catch (error) {
        console.error('Error getting knowledge for bot:', error);
        return '';
    }
};


// --- Bot Global Configuration ---

export interface BotGlobalConfig {
    systemInstruction: string;
    temperature: number;
    restrictToStudy?: boolean;
    interactionStyle?: 'formal' | 'friendly' | 'motivational' | 'coach' | 'default';
}

export const saveBotConfig = async (config: BotGlobalConfig) => {
    try {
        await setDoc(doc(db, 'settings', 'bot_config'), {
            ...config,
            updatedAt: Timestamp.now()
        }, { merge: true }); // Merge true allows partial updates if we add fields later
        console.log('Bot config saved');
    } catch (error) {
        console.error('Error saving bot config:', error);
        throw error;
    }
};

export const getBotConfig = async (): Promise<BotGlobalConfig | null> => {
    try {
        const docSnap = await getDoc(doc(db, 'settings', 'bot_config'));
        if (docSnap.exists()) {
            return docSnap.data() as BotGlobalConfig;
        }
        return null; // Return null if not set, so we use defaults
    } catch (error) {
        console.error('Error getting bot config:', error);
        return null;
    }
};
