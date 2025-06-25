import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RichTextEditor } from '@/components/RichTextEditor';
import { Label } from '@/components/ui/label';
import { useToast } from "@/components/ui/use-toast"
import Plus from 'lucide-react/dist/esm/icons/plus';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import EyeOff from 'lucide-react/dist/esm/icons/eye-off';
import { Checkbox } from '@/components/ui/checkbox';

export default function NewThreadPage() {
  const { nodeId } = useParams<{ nodeId: string }>();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const [isAuthorOnly, setIsAuthorOnly] = useState(false);

  const [type, setType] = useState<'discussion' | 'poll'>('discussion');
  const [readPermission, setReadPermission] = useState(0);
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);

  const handlePollOptionChange = (index: number, value: string) => {
    const newOptions = [...pollOptions];
    newOptions[index] = value;
    setPollOptions(newOptions);
  };

  const addPollOption = () => setPollOptions([...pollOptions, '']);
  const removePollOption = (index: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim() || !nodeId) return;

    setIsSubmitting(true);
    try {
      const payload = {
        nodeId: parseInt(nodeId!, 10),
        title,
        body,
        type,
        readPermission,
        isAuthorOnly,
        pollOptions: type === 'poll' ? pollOptions.filter(opt => opt.trim() !== '') : undefined,
      };
      const response = await apiClient.post<{ threadId: number }>('/threads', payload);
      toast({ title: "成功", description: "您的帖子已成功发布！" });
      navigate(`/threads/${response.threadId}`);
    } catch (error) {
      toast({ title: "错误", description: `发布失败: ${error}`, variant: "destructive" });
      console.error('Failed to create thread:', error);
    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <div className="max-w-[960px] mx-auto w-full">
      <form onSubmit={handleSubmit}>
        <div className="bg-white p-6 border border-[#CDCDCD] rounded-sm">
          {/* 帖子类型选择 */}
          <div className="flex border-b border-gray-300 mb-6">
            <button type="button" onClick={() => setType('discussion')} className={`px-5 py-2 text-sm font-bold ${type === 'discussion' ? 'text-[#336699] border-b-2 border-[#336699] -mb-px' : 'text-gray-600'}`}>发表帖子</button>
            <button type="button" onClick={() => setType('poll')} className={`px-5 py-2 text-sm font-bold ${type === 'poll' ? 'text-[#336699] border-b-2 border-[#336699] -mb-px' : 'text-gray-600'}`}>发起投票</button>
          </div>

          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="标题" className="h-10 text-lg mb-4" />
          <RichTextEditor value={body} onChange={setBody} />

          {/* 投票选项 */}
          {type === 'poll' && (
            <div className="mt-6 border-t pt-4">
              <Label className="font-bold mb-2 block">投票选项</Label>
              {pollOptions.map((option, index) => (
                <div key={index} className="flex items-center space-x-2 mb-2">
                  <Input value={option} onChange={(e) => handlePollOptionChange(index, e.target.value)} placeholder={`选项 ${index + 1}`} />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removePollOption(index)} disabled={pollOptions.length <= 2}><Trash2 className="w-4 h-4" /></Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addPollOption}><Plus className="w-4 h-4 mr-2" />添加选项</Button>
            </div>
          )}

          {/* 阅读权限 */}
          <div className="mt-6 border-t pt-4">
            <Label className="font-bold mb-2 block">阅读权限</Label>
            <Input type="number" value={readPermission} onChange={(e) => setReadPermission(parseInt(e.target.value, 10) || 0)} className="w-32" />
            <p className="text-xs text-gray-500 mt-1">设置阅读此主题所需的最低用户等级，0为不限制</p>
          </div>

          <div className="mt-6 border-t pt-4">
            <div className="flex items-center space-x-2">
              <Checkbox id="isAuthorOnly" checked={isAuthorOnly} onCheckedChange={(checked) => setIsAuthorOnly(Boolean(checked))} />
              <label htmlFor="isAuthorOnly" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center">
                <EyeOff className="w-4 h-4 mr-2 text-gray-500" />
                回帖仅作者可见
              </label>
            </div>
          </div>
          <div className="mt-6 text-center">
            <Button type="submit" className="bg-[#336699] hover:bg-[#2366A8] rounded-sm text-lg px-8 h-10 font-bold">发表帖子</Button>
          </div>
        </div>
      </form>
    </div>
  );
}
