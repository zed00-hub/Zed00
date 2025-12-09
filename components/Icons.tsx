import React from 'react';
import { 
  Send, 
  Paperclip, 
  FileText, 
  X, 
  Bot, 
  User, 
  Loader2,
  BookOpen,
  Trash2,
  UploadCloud,
  Search,
  Sun,
  Moon,
  Plus,
  MessageSquare,
  Layers,
  Edit2,
  Check
} from 'lucide-react';

export const SendIcon = () => <Send size={20} />;
export const AttachIcon = () => <Paperclip size={20} />;
export const FileIcon = () => <FileText size={20} />;
export const CloseIcon = () => <X size={16} />;
export const XIcon = () => <X size={14} />; // Smaller X for actions
export const BotIcon = () => <Bot size={24} />;
export const UserIcon = () => <User size={24} />;
export const LoadingIcon = () => <Loader2 size={24} className="animate-spin" />;
export const LogoIcon = () => <BookOpen size={32} />;
export const TrashIcon = () => <Trash2 size={16} />;
export const UploadIcon = () => <UploadCloud size={48} />;
export const SearchIcon = () => <Search size={16} />;
export const SunIcon = () => <Sun size={20} />;
export const MoonIcon = () => <Moon size={20} />;
export const PlusIcon = () => <Plus size={20} />;
export const ChatIcon = () => <MessageSquare size={18} />;
export const LayersIcon = () => <Layers size={18} />;
export const EditIcon = () => <Edit2 size={14} />;
export const CheckIcon = () => <Check size={14} />;

// Custom Z.G Logo Component to match the image provided
export const ZGLogo = () => (
  <div className="w-10 h-10 bg-black flex items-center justify-center overflow-hidden shadow-sm" style={{borderRadius: '4px'}}>
    <span className="text-white font-script text-2xl font-bold select-none" style={{ transform: 'rotate(-5deg) translate(1px, 1px)' }}>
      Z.G
    </span>
  </div>
);

export { BookOpen };