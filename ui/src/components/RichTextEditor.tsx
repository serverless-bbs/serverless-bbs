import React, { useRef, useCallback } from 'react';
import { apiClient } from '@/lib/api';
import { useToast } from './ui/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from './ui/button';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Color from '@tiptap/extension-color';
import TextStyle from '@tiptap/extension-text-style';
import Bold from 'lucide-react/dist/esm/icons/bold';
import Italic from 'lucide-react/dist/esm/icons/italic';
import UnderlineIcon from 'lucide-react/dist/esm/icons/underline';
import Strikethrough from 'lucide-react/dist/esm/icons/strikethrough';
import Palette from 'lucide-react/dist/esm/icons/palette';
import AlignLeft from 'lucide-react/dist/esm/icons/align-left';
import AlignCenter from 'lucide-react/dist/esm/icons/align-center';
import AlignRight from 'lucide-react/dist/esm/icons/align-right';
import List from 'lucide-react/dist/esm/icons/list';
import ListOrdered from 'lucide-react/dist/esm/icons/list-ordered';
import Smile from 'lucide-react/dist/esm/icons/smile';
import ImageIcon from 'lucide-react/dist/esm/icons/image';
import Paperclip from 'lucide-react/dist/esm/icons/paperclip';
import Table from 'lucide-react/dist/esm/icons/table';

// --- 子组件 ---
const ToolbarButton = ({ children, onClick, tip, isActive }: { children: React.ReactNode; onClick?: () => void; tip: string, isActive?: boolean }) => (
    <Button type="button" size="icon" variant="ghost" className={`h-6 w-6 p-1 ${isActive ? 'bg-blue-100 text-blue-600' : ''}`} onClick={onClick} title={tip}>
        {children}
    </Button>
);

const ColorPicker = ({ editor }: { editor: any }) => {
    const colors = ['#000000', '#FF0000', '#FFA500', '#FFFF00', '#008000', '#0000FF', '#800080'];
    return (
        <Popover>
            <PopoverTrigger asChild><ToolbarButton tip="颜色"><Palette size={16} /></ToolbarButton></PopoverTrigger>
            <PopoverContent className="w-auto p-1">
                <div className="grid grid-cols-7 gap-1">
                    {colors.map(color => (
                        <button key={color} onClick={() => editor.chain().focus().setColor(color).run()} className="w-6 h-6 rounded-sm" style={{ backgroundColor: color }} />
                    ))}
                    <button onClick={() => editor.chain().focus().unsetColor().run()} className="w-6 h-6 rounded-sm text-xs border">默认</button>
                </div>
            </PopoverContent>
        </Popover>
    );
};

// --- 主编辑器组件 ---
export const RichTextEditor = ({ value, onChange }: { value: string, onChange: (html: string) => void }) => {
    const { toast } = useToast();
    const imageInputRef = useRef<HTMLInputElement>(null);
    const attachmentInputRef = useRef<HTMLInputElement>(null);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3, 4, 5, 6] },
            }),
            Underline,
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            Link.configure({ openOnClick: false }),
            Image,
            TextStyle,
            Color,
        ],
        content: value,
        // 使用 onUpdate，这是 Tiptap 推荐的方式，它不会导致光标跳动
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'p-3 min-h-[200px] focus:outline-none text-base leading-relaxed',
            },
        },
    });

    const handleFileUpload = useCallback(async (file: File, type: 'image' | 'attachment') => {
        if (!editor) return;
        const formData = new FormData();
        const endpoint = type === 'image' ? '/images' : '/attachments';
        formData.append(type, file);

        try {
            const res = await apiClient.postFormData<{ url: string, fileName?: string }>(endpoint, formData);
            if (type === 'image') {
                editor.chain().focus().setImage({ src: res.url }).run();
            } else {
                editor.chain().focus().insertContent(`<a href="${res.url}" target="_blank" download>${res.fileName || '下载附件'}</a>`).run();
            }
        } catch (error: any) {
            toast({ title: "上传失败", description: error.message, variant: "destructive" });
        }
    }, [editor, toast]);

    if (!editor) return null;

    return (
        <div className="border border-gray-300 rounded-sm bg-white">
            <div className="flex items-center justify-between p-1 border-b border-gray-200 bg-gray-50 flex-wrap">
                <div className="flex items-center flex-wrap">
                    <Select onValueChange={(val) => val === 'p' ? editor.chain().focus().setParagraph().run() : editor.chain().focus().toggleHeading({ level: parseInt(val) as any }).run()}><SelectTrigger className="w-24 h-6 text-xs mr-1"><SelectValue placeholder="大小" /></SelectTrigger><SelectContent><SelectItem value="p">段落</SelectItem>{[1, 2, 3, 4, 5, 6].map(h => <SelectItem key={h} value={`${h}`}>标题 {h}</SelectItem>)}</SelectContent></Select>
                    <div className="h-4 border-l mx-1"></div>
                    <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} tip="加粗"><Bold size={16} /></ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} tip="斜体"><Italic size={16} /></ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} tip="下划线"><UnderlineIcon size={16} /></ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} tip="删除线"><Strikethrough size={16} /></ToolbarButton>
                    <ColorPicker editor={editor} />
                    <div className="h-4 border-l mx-1"></div>
                    <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })} tip="居左"><AlignLeft size={16} /></ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })} tip="居中"><AlignCenter size={16} /></ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })} tip="居右"><AlignRight size={16} /></ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} tip="无序列表"><List size={16} /></ToolbarButton>
                    <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} tip="有序列表"><ListOrdered size={16} /></ToolbarButton>
                    <div className="h-4 border-l mx-1"></div>
                    <ToolbarButton onClick={() => { }} tip="表情"><Smile size={16} /></ToolbarButton>
                    <ToolbarButton onClick={() => imageInputRef.current?.click()} tip="图片"><ImageIcon size={16} /></ToolbarButton>
                    <ToolbarButton onClick={() => attachmentInputRef.current?.click()} tip="附件"><Paperclip size={16} /></ToolbarButton>
                    <ToolbarButton onClick={() => { }} tip="表格"><Table size={16} /></ToolbarButton>
                </div>
                <div className="flex items-center">
                    <Button variant="link" size="sm" className="text-xs text-gray-500">全屏</Button>
                </div>
            </div>

            <EditorContent editor={editor} />

            <input type="file" accept="image/*" ref={imageInputRef} onChange={(e) => e.target.files && handleFileUpload(e.target.files[0], 'image')} className="hidden" />
            <input type="file" ref={attachmentInputRef} onChange={(e) => e.target.files && handleFileUpload(e.target.files[0], 'attachment')} className="hidden" />
        </div>
    );
};
